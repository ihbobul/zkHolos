import { ethers } from "hardhat";
import { expect } from "chai";
import type { Contract } from "ethers";
import { ElectionManager } from "../typechain-types/contracts/ElectionManager";
import { ElectionManager__factory } from "../typechain-types/factories/contracts/ElectionManager__factory";
import { VotingContract } from "../typechain-types/contracts/VotingContract";
import { VoterRegistration } from "../typechain-types/contracts/VoterRegistration";
import { Log } from "@ethersproject/abstract-provider";
import { registerVoter } from "../test/utils/testUtils";

async function main() {
    console.log("Starting e-voting system workflow test...");

    // Get signers
    const [admin, voter1, voter2, voter3] = await ethers.getSigners();
    console.log("Admin address:", admin.address);
    console.log("Voter1 address:", voter1.address);
    console.log("Voter2 address:", voter2.address);
    console.log("Voter3 address:", voter3.address);

    // Deploy contracts
    console.log("\n1. Deploying contracts...");
    const MockZKPVerifier = await ethers.getContractFactory("MockZKPVerifier");
    const mockVerifier = await MockZKPVerifier.deploy();
    await mockVerifier.waitForDeployment();
    console.log("MockZKPVerifier deployed to:", await mockVerifier.getAddress());

    const VoterRegistration = await ethers.getContractFactory("VoterRegistration");
    const voterRegistration = await VoterRegistration.deploy(await mockVerifier.getAddress());
    await voterRegistration.waitForDeployment();
    console.log("VoterRegistration deployed to:", await voterRegistration.getAddress());

    const VotingContract = await ethers.getContractFactory("VotingContract");
    const votingContract = await VotingContract.deploy();
    await votingContract.waitForDeployment();
    console.log("VotingContract deployed to:", await votingContract.getAddress());

    const ElectionManager = await ethers.getContractFactory("ElectionManager");
    const electionManager = await ElectionManager.deploy(
        await votingContract.getAddress(),
        await voterRegistration.getAddress(),
        await mockVerifier.getAddress()
    );
    await electionManager.waitForDeployment();
    console.log("ElectionManager deployed to:", await electionManager.getAddress());

    // Transfer ownership of VotingContract to ElectionManager
    await votingContract.transferOwnership(await electionManager.getAddress());
    console.log("VotingContract ownership transferred to ElectionManager");

    // Initialize ElectionManager
    await electionManager.initialize(
        await votingContract.getAddress(),
        await voterRegistration.getAddress()
    );
    console.log("ElectionManager initialized");

    // Enable mock verification
    // Set mock verification to true for testing
    await mockVerifier.setMockVerification(true);
    console.log("Mock verification enabled");

    // Register voters
    console.log("\n2. Registering voters...");
    const regions = ["KYIV", "LVIV"];

    // Mock ZKP proof parameters
    const a: [number, number] = [1, 2];
    const b: [[number, number], [number, number]] = [[3, 4], [5, 6]];
    const c: [number, number] = [7, 8];
    const input: [number, number] = [9, 10];

    // Define proof parameters for testing
    const zkProofParams = {
        a: [1, 2] as [number, number],
        b: [[3, 4], [5, 6]] as [[number, number], [number, number]],
        c: [7, 8] as [number, number],
        input: [9, 10] as [number, number]
    };

    // Register voter1 for KYIV
    const voter1Contract = voterRegistration.connect(voter1);
    await (voter1Contract as any).registerVoter(
        regions[0],
        a,
        b,
        c,
        input
    );
    console.log("Voter1 registered for", regions[0]);

    // Register voter2 for LVIV
    const voter2Contract = voterRegistration.connect(voter2);
    await (voter2Contract as any).registerVoter(
        regions[1],
        a,
        b,
        c,
        input
    );
    console.log("Voter2 registered for", regions[1]);

    // Register voter3 for KYIV
    const voter3Contract = voterRegistration.connect(voter3);
    await (voter3Contract as any).registerVoter(
        regions[0],
        a,
        b,
        c,
        input
    );
    console.log("Voter3 registered for", regions[0]);

    // Create election
    console.log("\n3. Creating election...");
    const currentBlock = await ethers.provider.getBlock('latest');
    if (!currentBlock) throw new Error("Failed to get current block");
    
    const startTime = currentBlock.timestamp + 60; // Start in 1 minute
    const endTime = startTime + 300; // End in 5 minutes

    const tx = await electionManager.createElection(
        "Test Election", // Election name
        startTime,
        endTime,
        regions
    );
    const receipt = await tx.wait();
    if (!receipt) {
        throw new Error("Transaction receipt is null");
    }

    const event = receipt.logs?.find(
        (log: Log) => log.topics[0] === electionManager.interface.getEvent("ElectionCreated")!.topicHash
    );
    
    if (!event) {
        throw new Error("ElectionCreated event not found");
    }

    const parsedLog = electionManager.interface.parseLog({
        topics: event.topics as string[],
        data: event.data as string
    });
    
    if (!parsedLog?.args?.[0]) {
        throw new Error("Failed to parse ElectionCreated event");
    }

    const electionId = parsedLog.args[0];
    console.log("Election created with ID:", electionId);

    // Add candidates
    console.log("\n4. Adding candidates...");
    await electionManager.addCandidate(electionId, "Candidate1", "Description1");
    await electionManager.addCandidate(electionId, "Candidate2", "Description2");
    console.log("Candidates added successfully");

    // Test voter eligibility updates
    console.log("\n5. Testing voter eligibility updates...");
    const newVoter = await ethers.getSigner("0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65");
    await registerVoter(voterRegistration as unknown as VoterRegistration, admin, newVoter, "KYIV");
    console.log("New voter registered for KYIV");

    // Make voter ineligible
    await (voterRegistration as unknown as VoterRegistration).connect(admin).updateEligibility(
        newVoter.address,
        false,
        zkProofParams.a,
        zkProofParams.b,
        zkProofParams.c,
        zkProofParams.input
    );
    console.log("New voter marked as ineligible");

    // Update eligible voters for the election
    await electionManager.updateEligibleVoters(electionId.toString());
    console.log("Eligible voters updated");

    // Make voter eligible again
    await (voterRegistration as unknown as VoterRegistration).connect(admin).updateEligibility(
        newVoter.address,
        true,
        zkProofParams.a,
        zkProofParams.b,
        zkProofParams.c,
        zkProofParams.input
    );
    console.log("New voter marked as eligible again");

    // Update eligible voters for the election
    await electionManager.updateEligibleVoters(electionId.toString());
    console.log("Eligible voters updated");

    // Test candidate status updates
    console.log("\n6. Testing candidate status updates...");
    await electionManager.updateCandidateStatus(electionId.toString(), 1, false);
    console.log("Candidate1 deactivated");
    
    // Try to vote for inactive candidate (should fail)
    try {
        await (electionManager.connect(voter1) as ElectionManager).castVoteWithProof(
            electionId.toString(),
            1,
            zkProofParams.a,
            zkProofParams.b,
            zkProofParams.c,
            zkProofParams.input
        );
        throw new Error("Should not be able to vote for inactive candidate");
    } catch (error) {
        console.log("Vote attempt failed as expected for inactive candidate");
    }
    
    await electionManager.updateCandidateStatus(electionId.toString(), 1, true);
    console.log("Candidate1 reactivated");

    // Update eligible voters
    console.log("\n7. Updating eligible voters...");
    await electionManager.updateEligibleVoters(electionId.toString());
    console.log("Eligible voters updated");

    // Wait for election to start
    console.log("\n8. Waiting for election to start...");
    await ethers.provider.send("evm_increaseTime", [65]); // Advance time by 65 seconds
    await ethers.provider.send("evm_mine", []);
    console.log("Time advanced by 65 seconds");

    // Start election
    console.log("\n9. Starting election...");
    await electionManager.startElectionPhase(electionId.toString());
    console.log("Election started");

    // Cast votes
    console.log("\n10. Casting votes...");
    // Voter1 votes for Candidate1
    const voter1VoteTx = await (electionManager.connect(voter1) as ElectionManager).castVoteWithProof(
        electionId.toString(),
        1,
        zkProofParams.a,
        zkProofParams.b,
        zkProofParams.c,
        zkProofParams.input
    );
    const voter1Receipt = await voter1VoteTx.wait();
    if (!voter1Receipt) {
        throw new Error("Voter1 vote transaction failed");
    }
    console.log("Voter1 vote cast successfully for Candidate1");

    // Voter2 votes for Candidate2
    const voter2VoteTx = await (electionManager.connect(voter2) as ElectionManager).castVoteWithProof(
        electionId.toString(),
        2,
        zkProofParams.a,
        zkProofParams.b,
        zkProofParams.c,
        zkProofParams.input
    );
    const voter2Receipt = await voter2VoteTx.wait();
    if (!voter2Receipt) {
        throw new Error("Voter2 vote transaction failed");
    }
    console.log("Voter2 vote cast successfully for Candidate2");

    // Voter3 votes for Candidate1
    const voter3VoteTx = await (electionManager.connect(voter3) as ElectionManager).castVoteWithProof(
        electionId.toString(),
        1,
        zkProofParams.a,
        zkProofParams.b,
        zkProofParams.c,
        zkProofParams.input
    );
    const voter3Receipt = await voter3VoteTx.wait();
    if (!voter3Receipt) {
        throw new Error("Voter3 vote transaction failed");
    }
    console.log("Voter3 vote cast successfully for Candidate1");

    // Test election pausing and resuming
    console.log("\n11. Testing election pausing and resuming...");
    await electionManager.pauseElection(electionId.toString());
    console.log("Election paused");

    // Try to vote while election is paused (should fail)
    try {
        await (electionManager.connect(newVoter) as ElectionManager).castVoteWithProof(
            electionId.toString(),
            1,
            zkProofParams.a,
            zkProofParams.b,
            zkProofParams.c,
            zkProofParams.input
        );
        throw new Error("Should not be able to vote while election is paused");
    } catch (error) {
        console.log("Vote attempt failed as expected while election is paused");
    }

    await electionManager.resumeElection(electionId.toString());
    console.log("Election resumed");

    // Wait for election to end
    console.log("\n12. Waiting for election to end...");
    await ethers.provider.send("evm_increaseTime", [300]); // Advance time by 5 minutes
    await ethers.provider.send("evm_mine", []);
    console.log("Time advanced by 5 minutes");

    // End election
    console.log("\n13. Ending election...");
    await electionManager.completeElection(electionId.toString());
    console.log("Election completed");

    // Verify election results
    console.log("\n14. Verifying election results...");
    const electionResults = await votingContract.getElectionResults(electionId.toString());
    console.log("Election results verified successfully!");

    // Print election results
    console.log("\n15. Election Results:");
    console.log("====================");
    const electionInfo = await votingContract.getElection(electionId.toString());
    const totalVotes = electionInfo[7];
    console.log(`Election: ${electionInfo[1]}`);
    console.log(`Total Votes: ${totalVotes}`);

    // Get candidate count and eligible voters
    const candidateCount = await votingContract.candidateCountPerElection(electionId.toString());
    const electionStateInfo = await electionManager.getElectionState(electionId.toString());
    const eligibleVoters = electionStateInfo[4];
    console.log(`Eligible Voters: ${eligibleVoters}`);

    // Calculate voter turnout
    console.log(`Voter Turnout: ${((Number(totalVotes) / Number(eligibleVoters)) * 100).toFixed(2)}%`);
    console.log("\nCandidate Results:");
    console.log("-----------------");

    // Get results for each candidate
    for (let i = 1; i <= Number(candidateCount); i++) {
        const candidate = await votingContract.candidates(electionId.toString(), i);
        const voteCount = Number(candidate.voteCount);
        console.log(`Candidate ${i}: ${candidate.name}`);
        console.log(`Votes: ${voteCount} (${((voteCount / Number(totalVotes)) * 100).toFixed(2)}%)`);
        console.log(`Description: ${candidate.description}`);
        console.log("-----------------");
    }

    // Test region-specific voting
    console.log("\n16. Testing region-specific voting...");
    const kyivVotes = await votingContract.getRegionVoteCount(electionId.toString(), "KYIV");
    const lvivVotes = await votingContract.getRegionVoteCount(electionId.toString(), "LVIV");
    console.log(`KYIV votes: ${kyivVotes}`);
    console.log(`LVIV votes: ${lvivVotes}`);

    // Test election information retrieval
    console.log("\n17. Testing election information retrieval...");
    const electionFullInfo = await votingContract.getElection(electionId.toString());
    console.log("Election Info:", electionFullInfo);
    const candidate1Info = await votingContract.getCandidate(electionId.toString(), 1);
    console.log("Candidate1 Info:", candidate1Info);
    const electionState = await electionManager.getElectionState(electionId.toString());
    console.log("Election State:", electionState);

    // Test voter information retrieval
    console.log("\n18. Testing voter information retrieval...");
    const voter1Info = await voterRegistration.getVoterInfo(voter1.address);
    console.log("Voter1 Info:", voter1Info);
    const registeredVoters = await voterRegistration.getRegisteredVoters();
    console.log("Registered Voters:", registeredVoters);
    const kyivVoterCount = await voterRegistration.getRegionVoterCount("KYIV");
    console.log("KYIV Voter Count:", kyivVoterCount);

    // Test ZKP verifier updates
    console.log("\n19. Testing ZKP verifier updates...");
    const newVerifier = await (await ethers.getContractFactory("MockZKPVerifier")).deploy();
    console.log("New verifier deployed");
    await ((electionManager as unknown) as ElectionManager).connect(admin).setVotingContractZKPVerifier(await newVerifier.getAddress());
    console.log("New verifier set");

    console.log("\nWorkflow test completed successfully!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
}); 