import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { ElectionManager, VoterRegistration, VotingContract, MockZKPVerifier } from "../../typechain-types";
import { BigNumberish } from "ethers";
import { EventLog } from "ethers";

export interface ElectionConfig {
  title?: string;
  description?: string;
  durationInHours?: number;
  regions?: string[];
  startTime?: number;
  endTime?: number;
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
  regions: ["KYIV", "LVIV"]
};

export async function deployContracts(owner: SignerWithAddress): Promise<TestContracts> {
  // Deploy mock verifier first
  const MockZKPVerifier = await ethers.getContractFactory("MockZKPVerifier", owner);
  const mockVerifier = await MockZKPVerifier.deploy() as unknown as MockZKPVerifier;
  await mockVerifier.waitForDeployment();
  await mockVerifier.connect(owner).setMockVerification(true);

  const VoterRegistration = await ethers.getContractFactory("VoterRegistration", owner);
  const voterRegistration = await VoterRegistration.deploy(await mockVerifier.getAddress()) as unknown as VoterRegistration;
  await voterRegistration.waitForDeployment();

  const VotingContract = await ethers.getContractFactory("VotingContract", owner);
  const votingContract = await VotingContract.deploy() as unknown as VotingContract;
  await votingContract.waitForDeployment();

  const ElectionManager = await ethers.getContractFactory("ElectionManager", owner);
  const electionManager = await ElectionManager.deploy(
    await votingContract.getAddress(),
    await voterRegistration.getAddress(),
    await mockVerifier.getAddress()
  ) as unknown as ElectionManager;
  await electionManager.waitForDeployment();

  // Transfer ownership of VotingContract to ElectionManager
  await votingContract.connect(owner).transferOwnership(await electionManager.getAddress());

  return { electionManager, voterRegistration, votingContract };
}

export async function createElection(
  contract: ElectionManager | VotingContract,
  owner: SignerWithAddress,
  config: ElectionConfig = DEFAULT_ELECTION_CONFIG
): Promise<{ electionId: number; startTime: number; endTime: number }> {
  const currentTime = await time.latest();
  const startTime = config.startTime ?? currentTime + 3600; // 1 hour from now
  const endTime = config.endTime ?? startTime + (config.durationInHours || 2) * 3600;
  const regions = config.regions || DEFAULT_ELECTION_CONFIG.regions!;

  if ('startElectionPhase' in contract) {
    // ElectionManager contract
    const tx = await contract.connect(owner).createElection(
      config.title || DEFAULT_ELECTION_CONFIG.title!,
      startTime,
      endTime,
      regions
    );
    const receipt = await tx.wait();
    const event = receipt?.logs.find(
      (log): log is EventLog => log instanceof EventLog && log.eventName === "ElectionCreated"
    );
    const electionId = Number(event?.args?.[0] ?? 0);
    return { electionId, startTime, endTime };
  } else {
    // VotingContract
    const tx = await contract.connect(owner).createElection(
      config.title || DEFAULT_ELECTION_CONFIG.title!,
      config.description || DEFAULT_ELECTION_CONFIG.description!,
      startTime,
      endTime,
      regions
    );
    const receipt = await tx.wait();
    const event = receipt?.logs.find(
      (log): log is EventLog => log instanceof EventLog && log.eventName === "ElectionCreated"
    );
    const electionId = Number(event?.args?.[0] ?? 0);
    return { electionId, startTime, endTime };
  }
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
  // Mock ZKP proof parameters
  const a: [BigNumberish, BigNumberish] = [1, 1];
  const b: [[BigNumberish, BigNumberish], [BigNumberish, BigNumberish]] = [[1, 1], [1, 1]];
  const c: [BigNumberish, BigNumberish] = [1, 1];
  const input: [BigNumberish, BigNumberish] = [1, 1]; // Using [1, 1] to represent a valid proof

  await voterRegistration.connect(voter).registerVoter(
    region,
    a,
    b,
    c,
    input
  );
}

export async function startElection(
  contract: ElectionManager | VotingContract,
  owner: SignerWithAddress,
  electionId: number,
  startTime: number
): Promise<void> {
  // Ensure we're at least 1 second after the start time
  await time.increaseTo(startTime + 2);
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