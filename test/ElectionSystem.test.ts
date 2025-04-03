import { ethers } from "hardhat";
import * as chai from "chai";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { registerVoter } from "./utils/testUtils";
import { VotingContract } from "../typechain-types";
const { expect } = chai;

describe("Election System", function () {
    let electionManager: any;
    let voterRegistration: any;
    let verifier: any;
    let owner: any;
    let voter: any;
    let votingContract: VotingContract;

    beforeEach(async function () {
        [owner, voter] = await ethers.getSigners();

        // Deploy mock ZKP verifier
        const MockZKPVerifier = await ethers.getContractFactory("MockZKPVerifier");
        verifier = await MockZKPVerifier.deploy();
        await verifier.waitForDeployment();
        await verifier.connect(owner).setMockVerification(true);

        // Deploy voter registration
        const VoterRegistration = await ethers.getContractFactory("VoterRegistration");
        voterRegistration = await VoterRegistration.deploy(await verifier.getAddress());
        await voterRegistration.waitForDeployment();

        // Deploy voting contract
        const VotingContract = await ethers.getContractFactory("VotingContract");
        votingContract = await VotingContract.deploy() as unknown as VotingContract;
        await votingContract.waitForDeployment();

        // Deploy election manager
        const ElectionManager = await ethers.getContractFactory("ElectionManager");
        electionManager = await ElectionManager.deploy(
            await votingContract.getAddress(),
            await voterRegistration.getAddress(),
            await verifier.getAddress()
        );
        await electionManager.waitForDeployment();

        // Transfer ownership of voting contract to election manager
        await votingContract.connect(owner).transferOwnership(await electionManager.getAddress());
    });

    describe("Voter Registration", function () {
        it("should allow voter registration with valid proof", async function () {
            // Set mock verifier to return true
            await verifier.connect(owner).setMockVerification(true);

            const mockProof = {
                a: [1n, 2n] as [bigint, bigint],
                b: [[3n, 4n], [5n, 6n]] as [[bigint, bigint], [bigint, bigint]],
                c: [7n, 8n] as [bigint, bigint],
                input: [1n, 1n] as [bigint, bigint]
            };

            await voterRegistration.connect(voter).registerVoter(
                "US",
                mockProof.a,
                mockProof.b,
                mockProof.c,
                mockProof.input
            );

            const [region, isRegistered, isEligible] = await voterRegistration.getVoterInfo(voter.address);
            expect(isRegistered).to.be.true;
            expect(region).to.equal("US");
            expect(isEligible).to.be.true;
        });
    });

    describe("Election Management", function () {
        it("should create and manage elections", async function () {
            const currentTime = await time.latest();
            const startTime = currentTime + 3600; // 1 hour from now
            const endTime = startTime + 86400; // 24 hours later

            // Create election
            const tx = await electionManager.connect(owner).createElection(
                "Test Election",
                startTime,
                endTime,
                ["KYIV", "LVIV"]
            );
            const receipt = await tx.wait();
            const event = receipt?.logs.find(
                (log: any) => log.fragment?.name === "ElectionCreated"
            );
            const electionId = event?.args?.[0] ?? 1;

            // Add candidates
            await electionManager.connect(owner).addCandidate(electionId, "Candidate 1", "Description 1");
            await electionManager.connect(owner).addCandidate(electionId, "Candidate 2", "Description 2");

            // Register voter
            await registerVoter(voterRegistration, owner, voter, "KYIV");

            // Update eligible voters
            await electionManager.connect(owner).updateEligibleVoters(electionId);

            // Start election
            await time.increaseTo(startTime + 2);
            await time.increase(1); // Add 1 second delay
            await electionManager.connect(owner).startElectionPhase(electionId);

            const electionInfo = await electionManager.getElectionInfo(electionId);
            expect(electionInfo.name).to.equal("Test Election");
            expect(electionInfo.isActive).to.be.true;
        });

        it("should allow voting with valid proof", async function () {
            // Create election
            const currentTime = await time.latest();
            const startTime = currentTime + 3600;
            const endTime = startTime + 86400;
            const tx = await electionManager.connect(owner).createElection(
                "Test Election",
                startTime,
                endTime,
                ["KYIV", "LVIV"]
            );
            const receipt = await tx.wait();
            const event = receipt?.logs.find(
                (log: any) => log.fragment?.name === "ElectionCreated"
            );
            const electionId = event?.args?.[0] ?? 1;

            // Add candidates
            await electionManager.connect(owner).addCandidate(electionId, "Candidate 1", "Description 1");
            await electionManager.connect(owner).addCandidate(electionId, "Candidate 2", "Description 2");

            // Register voter
            const mockProof = {
                a: [1n, 2n] as [bigint, bigint],
                b: [[3n, 4n], [5n, 6n]] as [[bigint, bigint], [bigint, bigint]],
                c: [7n, 8n] as [bigint, bigint],
                input: [1n, 1n] as [bigint, bigint]
            };

            await voterRegistration.connect(voter).registerVoter(
                "KYIV",
                mockProof.a,
                mockProof.b,
                mockProof.c,
                mockProof.input
            );

            // Update eligible voters
            await electionManager.connect(owner).updateEligibleVoters(electionId);

            // Start election
            await time.increaseTo(startTime + 2);
            await time.increase(1); // Add 1 second delay
            await electionManager.connect(owner).startElectionPhase(electionId);

            // Cast vote
            await electionManager.connect(voter).castVote(
                electionId,
                mockProof.a,
                mockProof.b,
                mockProof.c,
                mockProof.input
            );

            const hasVoted = await electionManager.hasVoted(electionId, voter.address);
            expect(hasVoted).to.be.true;
        });
    });
}); 