import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { VotingIPFSService } from "../src/services/VotingIPFSService";
import { ElectionManager, VotingContract, VoterRegistration } from "../typechain-types";

interface ElectionData {
    id: number;
    title: string;
    description: string;
    candidates: {
        id: number;
        name: string;
        description: string;
        voteCount: number;
        isActive: boolean;
    }[];
    startTime: number;
    endTime: number;
    maxVoters: number;
    regions: string[];
}

async function main() {
    console.log("Starting frontend integration test...");

    // Get the contract instances
    const electionManager = await ethers.getContractAt("ElectionManager", "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9");
    const votingContract = await ethers.getContractAt("VotingContract", "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0");
    const voterRegistration = await ethers.getContractAt("VoterRegistration", "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512");

    // Initialize IPFS service
    const ipfsService = VotingIPFSService.getInstance();

    try {
        // Create election data
        const electionData: ElectionData = {
            id: 1,
            title: "Test Election",
            description: "This is a test election for frontend integration",
            candidates: [
                {
                    id: 1,
                    name: "Candidate 1",
                    description: "Description for candidate 1",
                    voteCount: 0,
                    isActive: true
                },
                {
                    id: 2,
                    name: "Candidate 2",
                    description: "Description for candidate 2",
                    voteCount: 0,
                    isActive: true
                }
            ],
            startTime: Math.floor(Date.now() / 1000) + 3600, // Start in 1 hour
            endTime: Math.floor(Date.now() / 1000) + 86400, // End in 24 hours
            maxVoters: 100,
            regions: ["Global"]
        };

        // Store election data on IPFS
        console.log("Storing election data on IPFS...");
        const electionHash = await ipfsService.storeElectionData(electionData);
        console.log(`Election data stored with hash: ${electionHash}`);

        // Create the election on-chain
        console.log("Creating election on-chain...");
        const tx = await electionManager.createElection(
            electionData.title,
            electionData.description,
            electionData.startTime,
            electionData.endTime,
            electionData.regions,
            electionData.candidates,
            electionHash
        );
        const receipt = await tx.wait();
        
        // Get the election ID from the event
        const event = receipt?.logs.find(
            log => log.topics[0] === ethers.id("ElectionCreated(uint256,string,uint256,uint256)")
        );
        if (!event) {
            throw new Error("ElectionCreated event not found");
        }
        const electionId = Number(event.topics[1]);
        console.log(`Election created on-chain with ID: ${electionId}`);

        // Simulate some votes
        console.log("Simulating votes...");
        const voters = [
            { address: "0x1234567890123456789012345678901234567890", region: "North America" },
            { address: "0x2345678901234567890123456789012345678901", region: "Europe" },
            { address: "0x3456789012345678901234567890123456789012", region: "Asia Pacific" }
        ];

        // Store vote records
        for (const voter of voters) {
            const voteRecord = {
                electionId,
                candidateId: Math.floor(Math.random() * 3) + 1, // Random candidate
                region: voter.region,
                voter: voter.address,
                timestamp: Math.floor(Date.now() / 1000),
                commitment: ethers.keccak256(ethers.toUtf8Bytes(voter.address + Date.now().toString()))
            };

            const voteHash = await ipfsService.storeVoteRecord(voteRecord);
            console.log(`Vote record stored with hash: ${voteHash} for voter ${voter.address}`);
        }

        // Register voters
        console.log("\nRegistering voters...");
        const votersAddresses = [
            "0x1234567890123456789012345678901234567890",
            "0x2345678901234567890123456789012345678901",
            "0x3456789012345678901234567890123456789012"
        ];

        // Mock ZKP proof parameters
        const mockProof = {
            a: [1, 1] as [number, number],
            b: [[1, 1], [1, 1]] as [[number, number], [number, number]],
            c: [1, 1] as [number, number],
            input: [1, 1] as [number, number]
        };

        for (let i = 0; i < votersAddresses.length; i++) {
            try {
                await voterRegistration.registerVoter(
                    "Region" + (i + 1),
                    mockProof.a,
                    mockProof.b,
                    mockProof.c,
                    mockProof.input
                );
                console.log(`Registered voter: ${votersAddresses[i]}`);
            } catch (error) {
                console.error(`Error registering voter ${votersAddresses[i]}:`, error);
            }
        }

        // Event listener for VoterRegistered event
        voterRegistration.on("VoterRegistered", (log: { args: any }) => {
            console.log("New voter registered:", log);
        });

        // Update eligible voters
        console.log("\nUpdating eligible voters...");
        await electionManager.updateEligibleVoters(electionId);
        console.log("Eligible voters updated");

        // Advance time to election start
        console.log("Advancing time...");
        await time.increaseTo(electionData.startTime + 60); // 1 minute after start time
        console.log("Time advanced to after election start time");

        // Start the election
        console.log("Starting the election...");
        await electionManager.startElectionPhase(electionId);
        console.log("Election started");

        // Verify frontend data retrieval
        console.log("\nVerifying frontend data retrieval...");
        
        // 1. Verify election data
        const retrievedElectionData = await ipfsService.retrieveElectionData(electionHash);
        console.log("\nRetrieved Election Data:");
        console.log("------------------------");
        console.log(`Title: ${retrievedElectionData.title}`);
        console.log(`Description: ${retrievedElectionData.description}`);
        console.log(`Regions: ${retrievedElectionData.regions.join(", ")}`);
        console.log(`Number of Candidates: ${retrievedElectionData.candidates.length}`);

        // 2. Verify on-chain data
        const onChainElection = await votingContract.getElection(electionId);
        console.log("\nOn-chain Election Data:");
        console.log("----------------------");
        console.log(`Title: ${onChainElection.title}`);
        console.log(`Description: ${onChainElection.description}`);
        console.log(`IPFS Hash: ${onChainElection.ipfsHash}`);
        console.log(`Active: ${onChainElection.isActive}`);
        console.log(`Total Votes: ${onChainElection.totalVotes}`);

        // 3. Verify data consistency
        console.log("\nVerifying Data Consistency:");
        console.log("--------------------------");
        console.log(`IPFS Hash Match: ${onChainElection.ipfsHash === electionHash ? "✓" : "✗"}`);
        console.log(`Title Match: ${onChainElection.title === retrievedElectionData.title ? "✓" : "✗"}`);
        console.log(`Description Match: ${onChainElection.description === retrievedElectionData.description ? "✓" : "✗"}`);

        if (onChainElection.ipfsHash !== electionHash ||
            onChainElection.title !== retrievedElectionData.title ||
            onChainElection.description !== retrievedElectionData.description) {
            throw new Error("Data consistency check failed");
        }

        console.log("\nFrontend integration test completed successfully!");

    } catch (error) {
        console.error("Error during frontend integration test:", error);
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 