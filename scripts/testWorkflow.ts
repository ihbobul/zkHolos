import { ethers } from "hardhat";
import { expect } from "chai";
import type { Contract } from "ethers";
import { ElectionManager } from "../typechain-types/contracts/ElectionManager";
import { ElectionManager__factory } from "../typechain-types/factories/contracts/ElectionManager__factory";
import { VotingContract } from "../typechain-types/contracts/VotingContract";
import { Log } from "@ethersproject/abstract-provider";

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
        (log: Log) => log.topics[0] === electionManager.interface.getEvent("ElectionCreated").topicHash
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

    // Update eligible voters
    console.log("\n5. Updating eligible voters...");
    await electionManager.updateEligibleVoters(electionId);
    console.log("Eligible voters updated");

    // Wait for election to start
    console.log("\n6. Waiting for election to start...");
    await ethers.provider.send("evm_increaseTime", [65]); // Advance time by 65 seconds
    await ethers.provider.send("evm_mine", []);
    console.log("Time advanced by 65 seconds");

    // Start election
    console.log("\n7. Starting election...");
    await electionManager.startElectionPhase(electionId);
    console.log("Election started");

    // Cast votes
    console.log("\n8. Casting votes...");
    const voter1ZkProofParams = {
        a: [1, 2] as [number, number],
        b: [[3, 4], [5, 6]] as [[number, number], [number, number]],
        c: [7, 8] as [number, number],
        input: [9, 10] as [number, number]
    };
    
    // Voter1 votes for Candidate1
    const voter1VoteTx = await (electionManager.connect(voter1) as ElectionManager).castVoteWithProof(
        electionId,
        1, // Candidate 1
        voter1ZkProofParams.a,
        voter1ZkProofParams.b,
        voter1ZkProofParams.c,
        voter1ZkProofParams.input
    );
    const voter1Receipt = await voter1VoteTx.wait();
    if (!voter1Receipt) {
        throw new Error("Voter1 vote transaction failed");
    }
    console.log("Voter1 vote cast successfully for Candidate1");
    
    // Listen for debug events
    const debugEvents = voter1Receipt.logs?.filter(
        (log: any) => {
            try {
                const topics = log?.topics?.[0];
                if (!topics) return false;
                return topics === electionManager.interface!.getEvent("DebugVoteAttempt")!.topicHash ||
                       topics === votingContract.interface!.getEvent("DebugVoteCast")!.topicHash ||
                       topics === votingContract.interface!.getEvent("DebugVoteWithProof")!.topicHash;
            } catch (error) {
                return false;
            }
        }
    ) || [];
    debugEvents.forEach((event: any) => {
        try {
            let parsed;
            const eventTopic = event?.topics?.[0];
            if (!eventTopic) return;
            if (eventTopic === electionManager.interface!.getEvent("DebugVoteAttempt")!.topicHash) {
                parsed = electionManager.interface!.parseLog(event);
            } else {
                parsed = votingContract.interface!.parseLog(event);
            }
            if (parsed) {
                console.log("Debug Event:", parsed.name, parsed.args);
            }
        } catch (error) {
            console.log("Failed to parse event:", error);
        }
    });

    // Voter2 votes for Candidate2
    const voter2ZkProofParams = {
        a: [2, 3] as [number, number],
        b: [[4, 5], [6, 7]] as [[number, number], [number, number]],
        c: [8, 9] as [number, number],
        input: [10, 11] as [number, number]
    };

    const voter2VoteTx = await (electionManager.connect(voter2) as ElectionManager).castVoteWithProof(
        electionId,
        2, // Candidate 2
        voter2ZkProofParams.a,
        voter2ZkProofParams.b,
        voter2ZkProofParams.c,
        voter2ZkProofParams.input
    );
    const voter2Receipt = await voter2VoteTx.wait();
    if (!voter2Receipt) {
        throw new Error("Voter2 vote transaction failed");
    }
    console.log("Voter2 vote cast successfully for Candidate2");
    
    // Listen for debug events
    const debugEvents2 = voter2Receipt.logs?.filter(
        (log: any) => {
            try {
                const topics = log?.topics?.[0];
                if (!topics) return false;
                return topics === electionManager.interface!.getEvent("DebugVoteAttempt")!.topicHash ||
                       topics === votingContract.interface!.getEvent("DebugVoteCast")!.topicHash ||
                       topics === votingContract.interface!.getEvent("DebugVoteWithProof")!.topicHash;
            } catch (error) {
                return false;
            }
        }
    ) || [];
    debugEvents2.forEach((event: any) => {
        try {
            let parsed;
            const eventTopic = event?.topics?.[0];
            if (!eventTopic) return;
            if (eventTopic === electionManager.interface!.getEvent("DebugVoteAttempt")!.topicHash) {
                parsed = electionManager.interface!.parseLog(event);
            } else {
                parsed = votingContract.interface!.parseLog(event);
            }
            if (parsed) {
                console.log("Debug Event:", parsed.name, parsed.args);
            }
        } catch (error) {
            console.log("Failed to parse event:", error);
        }
    });

    // Voter3 votes for Candidate1
    const voter3ZkProofParams = {
        a: [3, 4] as [number, number],
        b: [[5, 6], [7, 8]] as [[number, number], [number, number]],
        c: [9, 10] as [number, number],
        input: [11, 12] as [number, number]
    };

    const voter3VoteTx = await (electionManager.connect(voter3) as ElectionManager).castVoteWithProof(
        electionId,
        1, // Candidate 1
        voter3ZkProofParams.a,
        voter3ZkProofParams.b,
        voter3ZkProofParams.c,
        voter3ZkProofParams.input
    );
    const voter3Receipt = await voter3VoteTx.wait();
    if (!voter3Receipt) {
        throw new Error("Voter3 vote transaction failed");
    }
    console.log("Voter3 vote cast successfully for Candidate1");
    
    // Listen for debug events
    const debugEvents3 = voter3Receipt.logs?.filter(
        (log: any) => {
            try {
                const topics = log?.topics?.[0];
                if (!topics) return false;
                return topics === electionManager.interface!.getEvent("DebugVoteAttempt")!.topicHash ||
                       topics === votingContract.interface!.getEvent("DebugVoteCast")!.topicHash ||
                       topics === votingContract.interface!.getEvent("DebugVoteWithProof")!.topicHash;
            } catch (error) {
                return false;
            }
        }
    ) || [];
    debugEvents3.forEach((event: any) => {
        try {
            let parsed;
            const eventTopic = event?.topics?.[0];
            if (!eventTopic) return;
            if (eventTopic === electionManager.interface!.getEvent("DebugVoteAttempt")!.topicHash) {
                parsed = electionManager.interface!.parseLog(event);
            } else {
                parsed = votingContract.interface!.parseLog(event);
            }
            if (parsed) {
                console.log("Debug Event:", parsed.name, parsed.args);
            }
        } catch (error) {
            console.log("Failed to parse event:", error);
        }
    });

    // Wait for election to end
    console.log("\n9. Waiting for election to end...");
    await ethers.provider.send("evm_increaseTime", [300]); // Advance time by 5 minutes
    await ethers.provider.send("evm_mine", []);
    console.log("Time advanced by 5 minutes");

    // End election
    console.log("\n10. Ending election...");
    await electionManager.completeElection(electionId);
    console.log("Election completed");

    // Verify election results
    console.log("\n11. Verifying election results...");
    
    // Check election state
    const electionState = await electionManager.getElectionState(electionId);
    expect(electionState.phase).to.equal(2); // 2 = Completed phase
    
    // Get voting contract instance and results
    const votingContractInstance = await ethers.getContractAt("VotingContract", await electionManager.votingContract());
    if (!votingContractInstance) {
        throw new Error("Failed to get VotingContract instance");
    }
    const [totalVotes, candidateVoteCounts] = await votingContractInstance.getElectionResults(electionId);
    expect(totalVotes).to.equal(3n); // All three voters cast their votes
    
    // Verify all voters have voted
    expect(await electionManager.hasVoted(electionId, voter1.address)).to.be.true;
    expect(await electionManager.hasVoted(electionId, voter2.address)).to.be.true;
    expect(await electionManager.hasVoted(electionId, voter3.address)).to.be.true;
    
    // Check eligible voter count
    const eligibleVoters = await electionManager.getEligibleVoterCount();
    expect(eligibleVoters).to.equal(3); // All three registered voters are eligible
    
    console.log("Election results verified successfully!");

    // Display election results
    console.log("\n12. Election Results:");
    console.log("====================");
    
    // Get election info
    const electionDetails = await electionManager.getElectionInfo(electionId);
    console.log(`Election: ${electionDetails.name}`);
    console.log(`Total Votes: ${totalVotes}`);
    console.log(`Eligible Voters: ${eligibleVoters}`);
    const turnout = Number(totalVotes) / Number(eligibleVoters) * 100;
    console.log(`Voter Turnout: ${turnout.toFixed(2)}%`);
    
    // Get candidate count
    const candidateCount = await votingContractInstance.candidateCountPerElection(electionId);
    console.log("\nCandidate Results:");
    console.log("-----------------");
    
    // Display results for each candidate
    for (let i = 1; i <= candidateCount; i++) {
        const candidate = await votingContractInstance.candidates(electionId, i);
        const voteCount = Number(candidateVoteCounts[i - 1]);
        const votePercentage = (voteCount / Number(totalVotes) * 100).toFixed(2);
        console.log(`Candidate ${i}: ${candidate.name}`);
        console.log(`Votes: ${voteCount} (${votePercentage}%)`);
        console.log(`Description: ${candidate.description}`);
        console.log("-----------------");
    }

    console.log("\nWorkflow test completed successfully!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
}); 