import { ethers } from "hardhat";

async function main() {
  console.log("Starting deployment of e-voting system contracts...");

  // Deploy VoterRegistration contract
  console.log("Deploying VoterRegistration contract...");
  const VoterRegistration = await ethers.getContractFactory("VoterRegistration");
  const voterRegistration = await VoterRegistration.deploy();
  await voterRegistration.waitForDeployment();
  console.log("VoterRegistration deployed to:", await voterRegistration.getAddress());

  // Deploy VotingContract
  console.log("Deploying VotingContract...");
  const VotingContract = await ethers.getContractFactory("VotingContract");
  const votingContract = await VotingContract.deploy();
  await votingContract.waitForDeployment();
  console.log("VotingContract deployed to:", await votingContract.getAddress());

  // Deploy ElectionManager
  console.log("Deploying ElectionManager...");
  const ElectionManager = await ethers.getContractFactory("ElectionManager");
  const electionManager = await ElectionManager.deploy();
  await electionManager.waitForDeployment();
  console.log("ElectionManager deployed to:", await electionManager.getAddress());

  // Initialize ElectionManager with contract addresses
  console.log("Initializing ElectionManager...");
  await electionManager.initialize(
    await votingContract.getAddress(),
    await voterRegistration.getAddress()
  );
  console.log("ElectionManager initialized successfully");

  console.log("All contracts deployed successfully!");
  console.log("Contract addresses:");
  console.log("VoterRegistration:", await voterRegistration.getAddress());
  console.log("VotingContract:", await votingContract.getAddress());
  console.log("ElectionManager:", await electionManager.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 