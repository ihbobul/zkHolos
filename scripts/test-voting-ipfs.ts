import { ethers } from "hardhat";
import { VotingIPFSService } from "../src/services/VotingIPFSService";
import { ElectionManager } from "../typechain-types";

async function main() {
    // Contract addresses from deployment
    const ELECTION_MANAGER_ADDRESS = "0xa85233C63b9Ee964Add6F2cffe00Fd84eb32338f";
    const VOTING_CONTRACT_ADDRESS = "0x322813Fd9A801c5507c9de605d63CEA4f2CE6c44";

    // Get the contract instances
    const electionManager = await ethers.getContractAt("ElectionManager", ELECTION_MANAGER_ADDRESS);
    const votingContract = await ethers.getContractAt("VotingContract", VOTING_CONTRACT_ADDRESS);

    // Initialize IPFS service
    const ipfsService = VotingIPFSService.getInstance();

    // Create test election data
    const electionData = {
        id: 1,
        title: "Test Election",
        description: "A test election for IPFS integration",
        startTime: Math.floor(Date.now() / 1000) + 3600, // Start in 1 hour
        endTime: Math.floor(Date.now() / 1000) + 86400, // End in 24 hours
        regions: ["Region 1", "Region 2"],
        candidates: [
            {
                id: 1,
                name: "Candidate 1",
                description: "First candidate",
                voteCount: 0,
                isActive: true
            },
            {
                id: 2,
                name: "Candidate 2",
                description: "Second candidate",
                voteCount: 0,
                isActive: true
            }
        ]
    };

    try {
        // Store election data on IPFS
        console.log("Storing election data...");
        const electionHash = await ipfsService.storeElectionData(electionData);
        console.log(`Election data stored with hash: ${electionHash}`);

        // Verify we can retrieve the election data
        console.log("Retrieving election data...");
        const retrievedElectionData = await ipfsService.retrieveElectionData(electionHash);
        console.log("Retrieved election data:", retrievedElectionData);

        // Create test vote records
        const voteRecords = [
            {
                electionId: 1,
                candidateId: 1,
                region: "Region 1",
                voter: "0x1234567890123456789012345678901234567890",
                timestamp: Math.floor(Date.now() / 1000),
                commitment: "0xabcdef1234567890"
            },
            {
                electionId: 1,
                candidateId: 2,
                region: "Region 2",
                voter: "0x0987654321098765432109876543210987654321",
                timestamp: Math.floor(Date.now() / 1000),
                commitment: "0x1234567890abcdef"
            }
        ];

        // Store vote records on IPFS
        console.log("Storing vote records...");
        const voteHash = await ipfsService.storeVoteRecord(voteRecords[0]);
        console.log(`Vote records stored with hash: ${voteHash}`);

        // Verify we can retrieve the vote records
        console.log("Retrieving vote records...");
        const retrievedVoteRecords = await ipfsService.retrieveVoteRecords(voteHash);
        console.log("Retrieved vote records:", retrievedVoteRecords);

        // Create the election on-chain with IPFS hash
        const tx = await electionManager.createElection(
            electionData.title,
            electionData.description,
            electionData.startTime,
            electionData.endTime,
            electionData.regions,
            electionData.candidates,
            electionHash
        );
        await tx.wait();
        console.log("Election created on-chain with IPFS hash");

        // Verify data integrity
        console.log("Verifying data integrity...");
        const onChainElection = await votingContract.getElection(1);
        console.log("Election data integrity:", onChainElection.ipfsHash === electionHash ? "SUCCESS" : "FAILED");
        console.log("Vote records integrity:", (retrievedVoteRecords as any).commitment === voteRecords[0].commitment ? "SUCCESS" : "FAILED");

    } catch (error) {
        console.error("Error during testing:", error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 