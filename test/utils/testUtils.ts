import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { ElectionManager, VoterRegistration, VotingContract } from "../../typechain-types";

export interface ElectionConfig {
  title?: string;
  description?: string;
  durationInHours?: number;
  regions?: string[];
}

export interface TestContracts {
  electionManager: ElectionManager;
  voterRegistration: VoterRegistration;
  votingContract: VotingContract;
}

export const DEFAULT_ELECTION_CONFIG: ElectionConfig = {
  title: "Test Election",
  description: "Test Description",
  durationInHours: 2,
  regions: ["Kyiv", "Lviv"]
};

export async function deployContracts(owner: SignerWithAddress): Promise<TestContracts> {
  const VoterRegistration = await ethers.getContractFactory("VoterRegistration", owner);
  const voterRegistration = await VoterRegistration.deploy();
  await voterRegistration.waitForDeployment();

  const VotingContract = await ethers.getContractFactory("VotingContract", owner);
  const votingContract = await VotingContract.deploy();
  await votingContract.waitForDeployment();

  const ElectionManager = await ethers.getContractFactory("ElectionManager", owner);
  const electionManager = await ElectionManager.deploy();
  await electionManager.waitForDeployment();

  // Transfer ownership of VotingContract to ElectionManager
  await votingContract.connect(owner).transferOwnership(await electionManager.getAddress());
  
  await electionManager.initialize(
    await votingContract.getAddress(),
    await voterRegistration.getAddress()
  );

  return { electionManager, voterRegistration, votingContract };
}

export async function createElection(
  contract: ElectionManager | VotingContract,
  owner: SignerWithAddress,
  config: ElectionConfig = DEFAULT_ELECTION_CONFIG
): Promise<{ electionId: number; startTime: number; endTime: number }> {
  const currentTime = await time.latest();
  const startTime = currentTime + 3600; // 1 hour from now
  const endTime = startTime + (config.durationInHours || 2) * 3600;

  await contract.connect(owner).createElection(
    config.title || DEFAULT_ELECTION_CONFIG.title!,
    config.description || DEFAULT_ELECTION_CONFIG.description!,
    startTime,
    endTime,
    config.regions || DEFAULT_ELECTION_CONFIG.regions!
  );

  return { electionId: 1, startTime, endTime };
}

export async function addCandidate(
  contract: ElectionManager | VotingContract,
  owner: SignerWithAddress,
  electionId: number,
  name: string,
  description: string
): Promise<number> {
  await contract.connect(owner).addCandidate(
    electionId,
    name,
    description
  );
  return 1; // Returns candidateId (assuming sequential IDs starting from 1)
}

export async function registerVoter(
  voterRegistration: VoterRegistration,
  owner: SignerWithAddress,
  voter: SignerWithAddress,
  region: string
): Promise<void> {
  await voterRegistration.connect(owner).registerVoter(voter.address, region);
}

export async function startElection(
  contract: ElectionManager | VotingContract,
  owner: SignerWithAddress,
  electionId: number,
  startTime: number
): Promise<void> {
  await time.increaseTo(startTime);
  if ('startElectionPhase' in contract) {
    await contract.connect(owner).startElectionPhase(electionId);
  } else {
    await contract.connect(owner).startElection(electionId);
  }
}

export async function completeElection(
  contract: ElectionManager | VotingContract,
  owner: SignerWithAddress,
  electionId: number,
  endTime: number
): Promise<void> {
  await time.increaseTo(endTime);
  await contract.connect(owner).completeElection(electionId);
} 