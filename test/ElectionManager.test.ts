import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import {
  deployContracts,
  createElection,
  addCandidate,
  registerVoter,
  startElection,
  completeElection,
  TestContracts,
} from "./utils/testUtils";

describe("ElectionManager", function () {
  let contracts: TestContracts;
  let owner: SignerWithAddress;
  let voter1: SignerWithAddress;
  let voter2: SignerWithAddress;

  beforeEach(async function () {
    [owner, voter1, voter2] = await ethers.getSigners();
    contracts = await deployContracts(owner);
  });

  it("Should create and manage elections correctly", async function () {
    // Create election
    const { electionId, startTime, endTime } = await createElection(
      contracts.electionManager,
      owner,
      { regions: ["KYIV", "LVIV"] }
    );

    expect(await contracts.electionManager.electionCount()).to.equal(1);

    // Add candidates
    await addCandidate(contracts.electionManager, owner, electionId, "Candidate 1", "Description 1");
    await addCandidate(contracts.electionManager, owner, electionId, "Candidate 2", "Description 2");

    // Register voters
    await registerVoter(contracts.voterRegistration, owner, voter1, "KYIV");
    await registerVoter(contracts.voterRegistration, owner, voter2, "LVIV");

    // Update eligible voters
    await contracts.electionManager.connect(owner).updateEligibleVoters(electionId);

    // Start election
    await startElection(contracts.electionManager, owner, electionId, startTime);

    // Log stored regions
    const election = await contracts.votingContract.getElection(electionId);
    console.log('Stored regions:', election.regions);

    // Cast votes
    await contracts.votingContract.connect(voter1).castVote(electionId, 1, "KYIV");
    await contracts.votingContract.connect(voter2).castVote(electionId, 2, "LVIV");

    // End election
    await completeElection(contracts.electionManager, owner, electionId, endTime);

    // Verify results
    const results = await contracts.votingContract.getElectionResults(electionId);
    expect(results[0].voteCount).to.equal(1);
    expect(results[1].voteCount).to.equal(1);

    // Verify region vote counts
    expect(await contracts.votingContract.getRegionVoteCount(electionId, "KYIV")).to.equal(1);
    expect(await contracts.votingContract.getRegionVoteCount(electionId, "LVIV")).to.equal(1);
  });

  it("Should handle election pausing and resuming", async function () {
    // Create election with a 30-day duration to ensure plenty of time
    const currentTime = await time.latest();
    const startTime = currentTime + 3600; // 1 hour from now
    const endTime = startTime + 86400 * 30; // 30 days duration
  
    console.log('Current time:', currentTime);
    console.log('Start time:', startTime);
    console.log('End time:', endTime);
  
    // Get the current election count
    const electionCountBefore = await contracts.electionManager.electionCount();
  
    const { electionId } = await createElection(
      contracts.electionManager,
      owner,
      {
        title: "Test Election",
        startTime,
        endTime,
        regions: ["KYIV", "LVIV"]
      }
    );
  
    // Use the electionId from createElection
    console.log('Election ID:', electionId);
  
    // Add candidate
    await addCandidate(contracts.electionManager, owner, electionId, "Candidate 1", "Description 1");
  
    // Register voter
    await registerVoter(contracts.voterRegistration, owner, voter1, "KYIV");
    await contracts.electionManager.connect(owner).updateEligibleVoters(electionId);
  
    // Move time forward and start election
    await time.increaseTo(startTime + 1);
    console.log('Time after increaseTo:', await time.latest());
  
    await contracts.electionManager.connect(owner).startElectionPhase(electionId);
  
    // Verify election is active
    let electionState = await contracts.electionManager.getElectionState(electionId);
    expect(electionState.phase).to.equal(1); // Active phase
    expect(electionState.isPaused).to.be.false;
  
    // Pause the election
    await contracts.electionManager.connect(owner).pauseElection(electionId);
  
    // Verify election is paused
    electionState = await contracts.electionManager.getElectionState(electionId);
    expect(electionState.isPaused).to.be.true;
  
    // Try to vote while paused
    await expect(
      contracts.votingContract.connect(voter1).castVote(electionId, 1, "KYIV")
    ).to.be.revertedWith("Pausable: paused");
  
    // Move time forward slightly but ensure we're still within election duration
    await time.increaseTo(startTime + 3600); // Move to 1 hour after start
    console.log('Time before resume:', await time.latest());
  
    // Get election state before resuming
    electionState = await contracts.electionManager.getElectionState(electionId);
    console.log('Election state before resume:', {
      phase: electionState.phase,
      startTime: electionState.startTime,
      endTime: electionState.endTime,
      isPaused: electionState.isPaused
    });
  
    // Resume the election
    await contracts.electionManager.connect(owner).resumeElection(electionId);
  
    // Verify election is resumed
    electionState = await contracts.electionManager.getElectionState(electionId);
    expect(electionState.isPaused).to.be.false;
  
    // Voter should be able to vote now
    await contracts.votingContract.connect(voter1).castVote(electionId, 1, "KYIV");
  });
  

  it("Should handle candidate status updates", async function () {
    // Create election
    const { electionId, startTime } = await createElection(
      contracts.electionManager,
      owner,
      { regions: ["KYIV"] }
    );

    // Add candidate
    await addCandidate(contracts.electionManager, owner, electionId, "Candidate 1", "Description 1");

    // Register voters and update eligible voters
    await registerVoter(contracts.voterRegistration, owner, voter1, "KYIV");
    await contracts.electionManager.connect(owner).updateEligibleVoters(electionId);

    // Deactivate candidate (must be done before starting election)
    await contracts.electionManager.connect(owner).updateCandidateStatus(electionId, 1, false);

    // Start election
    await startElection(contracts.electionManager, owner, electionId, startTime);

    // Try to vote for inactive candidate
    await expect(
      contracts.votingContract.connect(voter1).castVote(electionId, 1, "KYIV")
    ).to.be.revertedWith("Candidate is not active");

    // Try to reactivate candidate after election started (should fail)
    await expect(
      contracts.electionManager.connect(owner).updateCandidateStatus(electionId, 1, true)
    ).to.be.revertedWith("Election not in registration phase");
  });
}); 