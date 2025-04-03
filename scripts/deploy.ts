import { ethers } from "hardhat";

async function main() {
  console.log("Starting deployment of e-voting system contracts...");

  // Deploy MockZKPVerifier first
  console.log("Deploying MockZKPVerifier...");
  const MockZKPVerifier = await ethers.getContractFactory("MockZKPVerifier");
  const mockVerifier = await MockZKPVerifier.deploy();
  await mockVerifier.waitForDeployment();
  console.log("MockZKPVerifier deployed to:", await mockVerifier.getAddress());

  // Deploy VoterRegistration contract
  console.log("Deploying VoterRegistration contract...");
  const VoterRegistration = await ethers.getContractFactory("VoterRegistration");
  const voterRegistration = await VoterRegistration.deploy(await mockVerifier.getAddress());
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
  const electionManager = await ElectionManager.deploy(
    await votingContract.getAddress(),
    await voterRegistration.getAddress(),
    await mockVerifier.getAddress()
  );
  await electionManager.waitForDeployment();
  console.log("ElectionManager deployed to:", await electionManager.getAddress());

  // Transfer ownership of VotingContract to ElectionManager
  console.log("Transferring VotingContract ownership to ElectionManager...");
  await votingContract.transferOwnership(await electionManager.getAddress());
  console.log("Ownership transferred successfully");

  // Set mock verification to true for testing
  console.log("Setting mock verification to true...");
  await mockVerifier.setMockVerification(true);
  console.log("Mock verification set to true");

  console.log("All contracts deployed successfully!");
  console.log("Contract addresses:");
  console.log("MockZKPVerifier:", await mockVerifier.getAddress());
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