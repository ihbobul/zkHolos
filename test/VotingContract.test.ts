import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { VotingContract } from "../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import {
  createElection,
  addCandidate,
  startElection,
  completeElection,
  ElectionConfig
} from "./utils/testUtils";

describe("VotingContract", function () {
  let votingContract: VotingContract;
  let owner: SignerWithAddress;
  let voter1: SignerWithAddress;
  let voter2: SignerWithAddress;

  beforeEach(async function () {
    [owner, voter1, voter2] = await ethers.getSigners();

    const VotingContract = await ethers.getContractFactory("VotingContract", owner);
    votingContract = await VotingContract.deploy();
    await votingContract.waitForDeployment();
  });

  it("Should create election correctly", async function () {
    const config: ElectionConfig = {
      title: "Test Election",
      description: "Test Description",
      durationInHours: 2,
      regions: ["Kyiv", "Lviv"]
    };

    const { electionId, startTime, endTime } = await createElection(
      votingContract,
      owner,
      config
    );

    const election = await votingContract.getElection(electionId);
    expect(election.title).to.equal(config.title);
    expect(election.description).to.equal(config.description);
    expect(election.startTime).to.equal(startTime);
    expect(election.endTime).to.equal(endTime);
    expect(election.isActive).to.be.false;
    expect(election.isCompleted).to.be.false;
    expect(election.totalVotes).to.equal(0);
    expect(election.totalEligibleVoters).to.equal(0);
    expect(election.regions).to.deep.equal(config.regions);
  });

  it("Should add candidates correctly", async function () {
    const { electionId } = await createElection(votingContract, owner, {
      regions: ["Kyiv"]
    });

    await addCandidate(votingContract, owner, electionId, "Candidate 1", "Description 1");

    const candidate = await votingContract.getCandidate(electionId, 1);
    expect(candidate.name).to.equal("Candidate 1");
    expect(candidate.description).to.equal("Description 1");
    expect(candidate.voteCount).to.equal(0);
    expect(candidate.isActive).to.be.true;
  });

  it("Should handle voting process correctly", async function () {
    const { electionId, startTime } = await createElection(votingContract, owner, {
      regions: ["Kyiv"]
    });

    await addCandidate(votingContract, owner, electionId, "Candidate 1", "Description 1");

    // Start election
    await startElection(votingContract, owner, electionId, startTime);

    // Cast vote
    await votingContract.connect(voter1).castVote(electionId, 1, "Kyiv");

    // Verify vote was recorded
    const results = await votingContract.getElectionResults(electionId);
    expect(results[0].voteCount).to.equal(1);

    // Verify region vote count
    expect(await votingContract.getRegionVoteCount(electionId, "Kyiv")).to.equal(1);

    // Try to vote again (should fail)
    await expect(
      votingContract.connect(voter1).castVote(electionId, 1, "Kyiv")
    ).to.be.revertedWith("Already voted");

    // Try to vote for invalid region (should fail)
    await expect(
      votingContract.connect(voter2).castVote(electionId, 1, "InvalidRegion")
    ).to.be.revertedWith("Invalid region for this election");
  });

  it("Should handle election completion correctly", async function () {
    const { electionId, startTime, endTime } = await createElection(votingContract, owner, {
      regions: ["Kyiv"]
    });

    await addCandidate(votingContract, owner, electionId, "Candidate 1", "Description 1");

    // Start election
    await startElection(votingContract, owner, electionId, startTime);

    // Cast vote
    await votingContract.connect(voter1).castVote(electionId, 1, "Kyiv");

    // Complete election
    await completeElection(votingContract, owner, electionId, endTime);

    // Verify election is completed
    const election = await votingContract.getElection(electionId);
    expect(election.isCompleted).to.be.true;
    expect(election.isActive).to.be.false;

    // Try to vote after completion (should fail)
    await expect(
      votingContract.connect(voter2).castVote(electionId, 1, "Kyiv")
    ).to.be.revertedWith("Election is not active");
  });
}); 