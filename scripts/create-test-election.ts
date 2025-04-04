import { ethers } from "hardhat";

async function main() {
  console.log("Creating test election...");

  // Get the ElectionManager contract
  const electionManager = await ethers.getContractAt(
    "ElectionManager",
    "0xcf7ed3acca5a467e9e704c703e8d87f634fb0fc9"
  );

  // Current timestamp plus 2 minutes
  const now = Math.floor(Date.now() / 1000);
  const startTime = now + 120; // starts in 2 minutes
  const endTime = now + 7 * 24 * 60 * 60; // ends in 7 days
  
  // Election details
  const title = "Test Election 2024";
  const description = "This is a test election for development purposes";
  const regions = ["Region 1", "Region 2"];
  const candidates = [
    {
      id: 1,
      name: "Candidate 1",
      description: "First test candidate",
      voteCount: 0,
      isActive: true
    },
    {
      id: 2,
      name: "Candidate 2",
      description: "Second test candidate",
      voteCount: 0,
      isActive: true
    }
  ];
  const ipfsHash = "QmTest"; // Placeholder IPFS hash

  console.log("Creating election with the following details:");
  console.log("Title:", title);
  console.log("Start time:", new Date(startTime * 1000).toLocaleString());
  console.log("End time:", new Date(endTime * 1000).toLocaleString());

  // Create the election
  const tx = await electionManager.createElection(
    title,
    description,
    startTime,
    endTime,
    regions,
    candidates,
    ipfsHash
  );

  console.log("Transaction sent:", tx.hash);
  await tx.wait();
  console.log("Election created successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 