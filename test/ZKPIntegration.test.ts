import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { VotingContract, VoterRegistration, ElectionManager, MockZKPVerifier } from "../typechain-types";
import { deployContracts, registerVoter, startElection, completeElection } from "./utils/testUtils";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { ContractEvent, EventLog } from "ethers";

describe("ZKP Integration", function () {
    let owner: SignerWithAddress;
    let voter: SignerWithAddress;
    let contracts: {
        electionManager: ElectionManager;
        voterRegistration: VoterRegistration;
        votingContract: VotingContract;
        mockVerifier: MockZKPVerifier;
    };
    let electionId: number;
    let candidateId: number;
    const region = "Kyiv";
    let startTime: number;
    let endTime: number;

    beforeEach(async function () {
        [owner, voter] = await ethers.getSigners();
        
        // Deploy base contracts
        const baseContracts = await deployContracts(owner);
        
        // Deploy mock ZKP verifier
        const MockZKPVerifier = await ethers.getContractFactory("MockZKPVerifier");
        const mockVerifier = await MockZKPVerifier.deploy() as unknown as MockZKPVerifier;
        
        contracts = {
            ...baseContracts,
            mockVerifier
        };
        
        // Register voter
        await registerVoter(contracts.voterRegistration, owner, voter, region);
        
        // Set election times
        const currentTime = await time.latest();
        startTime = currentTime + 3600; // 1 hour from now
        endTime = startTime + 7200; // 2 hours duration
        
        // Create election
        const tx = await contracts.electionManager.createElection(
            "Test Election",
            startTime,
            endTime,
            [region]
        );
        const receipt = await tx.wait();
        const event = receipt?.logs.find(
            (log): log is EventLog => log instanceof EventLog && log.eventName === "ElectionCreated"
        );
        electionId = Number(event?.args?.[0] ?? 0);
        
        // Add candidate
        const addCandidateTx = await contracts.electionManager.addCandidate(
            electionId,
            "Test Candidate",
            "Test Candidate Description"
        );
        const addCandidateReceipt = await addCandidateTx.wait();
        const addCandidateEvent = addCandidateReceipt?.logs.find(
            (log): log is EventLog => log instanceof EventLog && log.eventName === "CandidateAdded"
        );
        candidateId = Number(addCandidateEvent?.args?.[1] ?? 0);
        
        // Update candidate status in registration phase
        await contracts.electionManager.connect(owner).updateCandidateStatus(electionId, candidateId, true);
        
        // Update eligible voters
        await contracts.electionManager.updateEligibleVoters(electionId);
        
        // Start election
        await startElection(contracts.electionManager, owner, electionId, startTime);
    });

    describe("ZKP Verifier Setup", function () {
        it("Should set ZKP verifier correctly", async function () {
            // Set the ZKP verifier through the ElectionManager
            await contracts.electionManager.connect(owner).setVotingContractZKPVerifier(await contracts.mockVerifier.getAddress());
            expect(await contracts.votingContract.zkpVerifier()).to.equal(
                await contracts.mockVerifier.getAddress()
            );
        });

        it("Should not allow non-owner to set ZKP verifier", async function () {
            await expect(
                contracts.electionManager.connect(voter).setVotingContractZKPVerifier(await contracts.mockVerifier.getAddress())
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("Vote Casting with ZKP", function () {
        beforeEach(async function () {
            // Set the ZKP verifier through the ElectionManager
            await contracts.electionManager.connect(owner).setVotingContractZKPVerifier(await contracts.mockVerifier.getAddress());
        });

        it("Should not allow voting with invalid proof", async function () {
            // Set mock verifier to return false for this test
            await contracts.mockVerifier.connect(owner).setMockVerification(false);

            const mockProof = {
                a: [0n, 0n] as [bigint, bigint],
                b: [[0n, 0n], [0n, 0n]] as [[bigint, bigint], [bigint, bigint]],
                c: [0n, 0n] as [bigint, bigint],
                input: [0n, 0n] as [bigint, bigint]
            };
            
            const commitment = ethers.keccak256(ethers.toUtf8Bytes("test_commitment"));
            
            await expect(
                contracts.votingContract.connect(voter).castVoteWithProof(
                    electionId,
                    candidateId,
                    mockProof.a,
                    mockProof.b,
                    mockProof.c,
                    mockProof.input,
                    commitment
                )
            ).to.be.reverted;
        });

        it("Should not allow double voting with same commitment", async function () {
            // Set mock verifier to return true
            await contracts.mockVerifier.connect(owner).setMockVerification(true);

            const mockProof = {
                a: [1n, 2n] as [bigint, bigint],
                b: [[3n, 4n], [5n, 6n]] as [[bigint, bigint], [bigint, bigint]],
                c: [7n, 8n] as [bigint, bigint],
                input: [1n, 1n] as [bigint, bigint]
            };

            const commitment = ethers.keccak256(ethers.toUtf8Bytes("test_commitment"));
            
            // First vote should succeed
            await contracts.votingContract.connect(voter).castVoteWithProof(
                electionId,
                candidateId,
                mockProof.a,
                mockProof.b,
                mockProof.c,
                mockProof.input,
                commitment
            );
            
            // Second vote with same commitment should fail
            await expect(
                contracts.votingContract.connect(voter).castVoteWithProof(
                    electionId,
                    candidateId,
                    mockProof.a,
                    mockProof.b,
                    mockProof.c,
                    mockProof.input,
                    commitment
                )
            ).to.be.revertedWith("Commitment already used");
        });
    });
}); 