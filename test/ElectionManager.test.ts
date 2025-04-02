import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { ElectionManager, VoterRegistration, VotingContract } from "../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import {
  deployContracts,
  createElection,
  addCandidate,
  registerVoter,
  startElection,
  completeElection,
  TestContracts
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
      { regions: ["Kyiv", "Lviv"] }
    );

    expect(await contracts.electionManager.electionCount()).to.equal(1);

    // Add candidates
    await addCandidate(contracts.electionManager, owner, electionId, "Candidate 1", "Description 1");
    await addCandidate(contracts.electionManager, owner, electionId, "Candidate 2", "Description 2");

    // Register voters
    await registerVoter(contracts.voterRegistration, owner, voter1, "Kyiv");
    await registerVoter(contracts.voterRegistration, owner, voter2, "Lviv");

    // Update eligible voters
    await contracts.electionManager.connect(owner).updateEligibleVoters(electionId);

    // Start election
    await startElection(contracts.electionManager, owner, electionId, startTime);

    // Cast votes
    await contracts.votingContract.connect(voter1).castVote(electionId, 1, "Kyiv");
    await contracts.votingContract.connect(voter2).castVote(electionId, 2, "Lviv");

    // End election
    await completeElection(contracts.electionManager, owner, electionId, endTime);

    // Verify results
    const results = await contracts.votingContract.getElectionResults(electionId);
    expect(results[0].voteCount).to.equal(1);
    expect(results[1].voteCount).to.equal(1);

    // Verify region vote counts
    expect(await contracts.votingContract.getRegionVoteCount(electionId, "Kyiv")).to.equal(1);
    expect(await contracts.votingContract.getRegionVoteCount(electionId, "Lviv")).to.equal(1);
  });

  it("Should handle election pausing and resuming", async function () {
    // Create election
    const { electionId, startTime } = await createElection(
      contracts.electionManager,
      owner,
      { regions: ["Kyiv"] }
    );

    // Add candidate
    await addCandidate(contracts.electionManager, owner, electionId, "Candidate 1", "Description 1");

    // Register voters and update eligible voters
    await registerVoter(contracts.voterRegistration, owner, voter1, "Kyiv");
    await contracts.electionManager.connect(owner).updateEligibleVoters(electionId);

    // Start election
    await startElection(contracts.electionManager, owner, electionId, startTime);

    // Pause election
    await contracts.electionManager.connect(owner).pauseElection(electionId);
    expect(await contracts.electionManager.isElectionActive(electionId)).to.be.false;

    // Try to vote while paused
    await expect(
      contracts.votingContract.connect(voter1).castVote(electionId, 1, "Kyiv")
    ).to.be.revertedWith("Pausable: paused");

    // Resume election (make sure we're not past end time)
    await time.increaseTo(startTime + 1800); // Only 30 minutes into the election
    await contracts.electionManager.connect(owner).resumeElection(electionId);
    expect(await contracts.electionManager.isElectionActive(electionId)).to.be.true;

    // Vote after resume
    await contracts.votingContract.connect(voter1).castVote(electionId, 1, "Kyiv");
    const results = await contracts.votingContract.getElectionResults(electionId);
    expect(results[0].voteCount).to.equal(1);
  });

  it("Should handle candidate status updates", async function () {
    // Create election
    const { electionId, startTime } = await createElection(
      contracts.electionManager,
      owner,
      { regions: ["Kyiv"] }
    );

    // Add candidate
    await addCandidate(contracts.electionManager, owner, electionId, "Candidate 1", "Description 1");

    // Register voters and update eligible voters
    await registerVoter(contracts.voterRegistration, owner, voter1, "Kyiv");
    await contracts.electionManager.connect(owner).updateEligibleVoters(electionId);

    // Deactivate candidate (must be done before starting election)
    await contracts.electionManager.connect(owner).updateCandidateStatus(electionId, 1, false);

    // Start election
    await startElection(contracts.electionManager, owner, electionId, startTime);

    // Try to vote for inactive candidate
    await expect(
      contracts.votingContract.connect(voter1).castVote(electionId, 1, "Kyiv")
    ).to.be.revertedWith("Candidate is not active");

    // Try to reactivate candidate after election started (should fail)
    await expect(
      contracts.electionManager.connect(owner).updateCandidateStatus(electionId, 1, true)
    ).to.be.revertedWith("Election not in registration phase");
  });
}); 