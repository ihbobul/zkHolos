import axios from 'axios';
import { ELECTION_MANAGER_ABI, VOTING_CONTRACT_ABI } from '../config/contracts';
import { ethers } from 'ethers';

// Contract interfaces
interface VotingContractInterface extends ethers.BaseContract {
  getElectionsLength(): Promise<bigint>;
  getElection(electionId: number): Promise<[bigint, string, string, bigint, bigint, boolean, boolean, bigint, bigint, string[], string]>;
  candidates(electionId: number, candidateId: number): Promise<[bigint, string, string, bigint, boolean]>;
  getRegionVoteCount(electionId: number, region: string): Promise<bigint>;
  hasVoted(electionId: number, voter: string): Promise<boolean>;
}

interface ElectionManagerInterface extends ethers.BaseContract {
  createElection(title: string, description: string, startTime: number, endTime: number, regions: string[], candidates: any[], ipfsHash: string): Promise<ethers.ContractTransactionResponse>;
  startElectionPhase(electionId: number): Promise<ethers.ContractTransactionResponse>;
  pauseElection(electionId: number): Promise<ethers.ContractTransactionResponse>;
  resumeElection(electionId: number): Promise<ethers.ContractTransactionResponse>;
  completeElection(electionId: number): Promise<ethers.ContractTransactionResponse>;
  addCandidate(electionId: number, name: string, description: string): Promise<ethers.ContractTransactionResponse>;
  updateCandidateStatus(electionId: number, candidateId: number, isActive: boolean): Promise<ethers.ContractTransactionResponse>;
  castVote(electionId: number, candidateId: number, region: string): Promise<ethers.ContractTransactionResponse>;
  castVoteWithProof(electionId: number, candidateId: number, a: [bigint, bigint], b: [[bigint, bigint], [bigint, bigint]], c: [bigint, bigint], input: [bigint, bigint]): Promise<ethers.ContractTransactionResponse>;
  getElectionState(electionId: number): Promise<[bigint, bigint, bigint, bigint, bigint, boolean]>;
  hasVoted(electionId: number, voter: string): Promise<boolean>;
}

export enum ElectionPhase {
  Registration = 0,
  Active = 1,
  Completed = 2
}

export interface Election {
  id: number;
  title: string;
  description: string;
  startTime: number;
  endTime: number;
  isActive: boolean;
  isCompleted: boolean;
  totalVotes: number;
  totalEligibleVoters: number;
  regions: string[];
  ipfsHash: string;
  candidates: Candidate[];
  phase?: ElectionPhase;
}

export interface Candidate {
  id: number;
  name: string;
  description: string;
  voteCount: number;
  isActive: boolean;
}

interface CreateElectionData {
  title: string;
  description: string;
  startTime: number;
  endTime: number;
  regions: string[];
  candidates: Candidate[];
  ipfsHash: string;
}

interface TransactionLog {
  topics: string[];
  data: string;
}

interface ParsedLog {
  name: string;
  args: {
    electionId: bigint;
    [key: string]: any;
  };
}

export interface VoteData {
  electionId: number;
  candidateId: number;
  region: string;
  proof?: ZKProof;
}

const HARDHAT_API_URL = 'http://localhost:8545';
const IPFS_API_URL = import.meta.env.VITE_IPFS_API_URL || 'http://127.0.0.1:5001/api/v0';
const IPFS_GATEWAY_URL = import.meta.env.VITE_IPFS_GATEWAY_URL || 'http://127.0.0.1:8080/ipfs';
const ELECTION_MANAGER_ADDRESS = import.meta.env.VITE_ELECTION_MANAGER_ADDRESS || '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9';
const VOTING_CONTRACT_ADDRESS = import.meta.env.VITE_VOTING_CONTRACT_ADDRESS || '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';

if (!ELECTION_MANAGER_ADDRESS) {
  throw new Error('VITE_ELECTION_MANAGER_ADDRESS environment variable is not set');
}

export interface ZKProof {
  a: [string, string];
  b: [[string, string], [string, string]];
  c: [string, string];
  input: [string, string];
}

class ElectionService {
  private provider: ethers.JsonRpcProvider;
  private electionManager: ElectionManagerInterface;
  private votingContract: VotingContractInterface;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(HARDHAT_API_URL);
    this.electionManager = (new ethers.Contract(
      ELECTION_MANAGER_ADDRESS,
      ELECTION_MANAGER_ABI,
      this.provider
    ) as unknown) as ElectionManagerInterface;
    this.votingContract = (new ethers.Contract(
      VOTING_CONTRACT_ADDRESS,
      VOTING_CONTRACT_ABI,
      this.provider
    ) as unknown) as VotingContractInterface;
  }

  private async getSignerContract(useVotingContract: boolean = false): Promise<VotingContractInterface | ElectionManagerInterface> {
    const signer = await this.provider.getSigner();
    if (useVotingContract) {
      return (this.votingContract.connect(signer) as unknown) as VotingContractInterface;
    }
    return (this.electionManager.connect(signer) as unknown) as ElectionManagerInterface;
  }

  async createElection(data: CreateElectionData): Promise<number> {
    try {
      console.log('Creating election with data:', data);

      const ipfsData = {
        candidates: data.candidates.map(c => ({
          ...c,
          voteCount: 0
        }))
      };
      const ipfsHash = await this.uploadToIPFS(ipfsData);
      console.log('IPFS upload successful, hash:', ipfsHash);

      const contract = await this.getSignerContract(false) as ElectionManagerInterface;

      // Prepare candidates array
      const candidates = data.candidates.map((c, index) => ({
        id: index + 1,
        name: c.name,
        description: c.description,
        voteCount: 0,
        isActive: true
      }));

      const tx = await contract.createElection(
        data.title,
        data.description,
        Math.floor(data.startTime / 1000),
        Math.floor(data.endTime / 1000),
        data.regions,
        candidates,
        ipfsHash
      );

      console.log('Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error('Transaction failed');
      }

      // Parse the ElectionCreated event
      const event = receipt.logs.find(
        (log: any) => log.topics[0] === contract.interface.getEvent("ElectionCreated")?.topicHash
      );

      if (event) {
        const parsedLog = contract.interface.parseLog({
          topics: event.topics,
          data: event.data
        });
        const electionId = Number(parsedLog?.args?.[0]);
        console.log('Successfully created election with ID:', electionId);
        return electionId;
      }

      throw new Error('Failed to get election ID from event');
    } catch (error) {
      console.error('Error creating election:', error);
      throw error;
    }
  }

  async getElections(): Promise<Election[]> {
    try {
      const length = await this.votingContract.getElectionsLength();
      const elections: Election[] = [];

      for (let i = 1; i <= length; i++) {
        const election = await this.getElection(i);
        if (election) {
          elections.push(election);
        }
      }

      return elections;
    } catch (error) {
      console.error('Error fetching elections:', error);
      throw error;
    }
  }

  async getElection(electionId: number): Promise<Election | null> {
    try {
      const [id, title, description, startTime, endTime, isActive, isCompleted, totalVotes, totalEligibleVoters, regions, ipfsHash] = 
        await this.votingContract.getElection(electionId);

      // Get election phase
      const contract = await this.getSignerContract(false) as ElectionManagerInterface;
      const [, phase] = await contract.getElectionState(electionId);

      let candidates: Candidate[] = [];
      if (ipfsHash) {
        try {
          const ipfsData = await this.getFromIPFS(ipfsHash);
          if (ipfsData && ipfsData.candidates) {
            candidates = ipfsData.candidates;
          }
        } catch (error) {
          console.error('Error fetching candidates from IPFS:', error);
        }
      }

      return {
        id: Number(id),
        title,
        description,
        startTime: Number(startTime) * 1000,
        endTime: Number(endTime) * 1000,
        isActive,
        isCompleted,
        totalVotes: Number(totalVotes),
        totalEligibleVoters: Number(totalEligibleVoters),
        regions,
        ipfsHash,
        candidates,
        phase: Number(phase) as ElectionPhase
      };
    } catch (error) {
      console.error('Error fetching election:', error);
      throw error;
    }
  }

  async startElection(electionId: number): Promise<void> {
    try {
      const contract = await this.getSignerContract(false) as ElectionManagerInterface;
      const tx = await contract.startElectionPhase(electionId);
      await tx.wait();
    } catch (error) {
      console.error('Error starting election:', error);
      throw error;
    }
  }

  async pauseElection(electionId: number): Promise<void> {
    try {
      const contract = await this.getSignerContract(false) as ElectionManagerInterface;
      const tx = await contract.pauseElection(electionId);
      await tx.wait();
    } catch (error) {
      console.error('Error pausing election:', error);
      throw error;
    }
  }

  async resumeElection(electionId: number): Promise<void> {
    try {
      const contract = await this.getSignerContract(false) as ElectionManagerInterface;
      const tx = await contract.resumeElection(electionId);
      await tx.wait();
    } catch (error) {
      console.error('Error resuming election:', error);
      throw error;
    }
  }

  async endElection(electionId: number): Promise<void> {
    try {
      const contract = await this.getSignerContract(false) as ElectionManagerInterface;
      const tx = await contract.completeElection(electionId);
      await tx.wait();
    } catch (error) {
      console.error('Error ending election:', error);
      throw error;
    }
  }

  async addCandidate(electionId: number, name: string, description: string): Promise<void> {
    try {
      console.log('Adding candidate:', { electionId, name, description });
      const contract = await this.getSignerContract(false) as ElectionManagerInterface;
      
      // Check election phase first
      const [id, phase, startTime, endTime, totalEligibleVoters, isPaused] = await contract.getElectionState(electionId);
      console.log('Election state:', { id, phase, startTime, endTime, totalEligibleVoters, isPaused });
      
      if (phase !== BigInt(0)) { // 0 = Registration phase
        throw new Error('Election must be in registration phase to add candidates');
      }
      
      console.log('Sending addCandidate transaction...');
      const tx = await contract.addCandidate(
        electionId,
        name,
        description
      );

      console.log('Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error('Transaction failed');
      }

      // Parse the CandidateAdded event
      const event = receipt.logs.find(
        (log: any) => log.topics[0] === contract.interface.getEvent("CandidateAdded")?.topicHash
      );

      if (event) {
        const parsedLog = contract.interface.parseLog({
          topics: event.topics,
          data: event.data
        });
        console.log('Successfully added candidate. Event:', parsedLog);
      } else {
        console.warn('CandidateAdded event not found in receipt');
      }

      // Refresh the election data
      await this.getElection(electionId);
    } catch (error) {
      console.error('Error adding candidate:', error);
      throw error;
    }
  }

  async updateCandidateStatus(electionId: number, candidateId: number, isActive: boolean): Promise<void> {
    try {
      const contract = await this.getSignerContract(false) as ElectionManagerInterface;
      const tx = await contract.updateCandidateStatus(electionId, candidateId, isActive);
      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error('Transaction failed');
      }
    } catch (error) {
      console.error('Error updating candidate status:', error);
      throw error;
    }
  }

  async hasVoted(electionId: number, address: string): Promise<boolean> {
    try {
      console.log('Checking if user has voted:', { electionId, address });
      const contract = await this.getSignerContract(true) as VotingContractInterface;
      return await contract.hasVoted(electionId, address);
    } catch (error) {
      console.error('Error checking if user has voted:', error);
      throw error;
    }
  }

  async castVote(data: { electionId: number; candidateId: number; region: string; proof?: ZKProof }): Promise<void> {
    try {
      const contract = await this.getSignerContract(false) as ElectionManagerInterface;
      let tx;
      
      if (data.proof) {
        // Convert hex strings to BigNumbers
        const proofA = data.proof.a.map(x => ethers.toBigInt(x)) as [bigint, bigint];
        const proofB = data.proof.b.map(row => row.map(x => ethers.toBigInt(x))) as [[bigint, bigint], [bigint, bigint]];
        const proofC = data.proof.c.map(x => ethers.toBigInt(x)) as [bigint, bigint];
        const proofInput = data.proof.input.map(x => ethers.toBigInt(x)) as [bigint, bigint];

        tx = await contract.castVoteWithProof(
          data.electionId,
          data.candidateId,
          proofA,
          proofB,
          proofC,
          proofInput
        );
      } else {
        tx = await contract.castVote(
          data.electionId,
          data.candidateId,
          data.region
        );
      }

      await tx.wait();
    } catch (error) {
      console.error('Error casting vote:', error);
      throw error;
    }
  }

  async getFromIPFS(hash: string): Promise<any> {
    try {
      // Try gateway first
      try {
        const response = await axios.get(`${IPFS_GATEWAY_URL}/${hash}`);
        return response.data;
      } catch (gatewayError) {
        console.warn('Gateway request failed, falling back to API:', gatewayError);
      }

      // Fallback to API
      const response = await axios.get(`${IPFS_API_URL}/cat`, {
        params: { arg: hash }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching from IPFS:', error);
      throw error;
    }
  }

  async uploadToIPFS(data: any): Promise<string> {
    try {
      const jsonString = JSON.stringify(data);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const formData = new FormData();
      formData.append('file', blob, 'data.json');

      const response = await axios.post(`${IPFS_API_URL}/add`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (!response.data || !response.data.Hash) {
        throw new Error('Failed to get IPFS hash');
      }

      return response.data.Hash;
    } catch (error) {
      console.error('Error uploading to IPFS:', error);
      throw error;
    }
  }
}

export const electionService = new ElectionService();