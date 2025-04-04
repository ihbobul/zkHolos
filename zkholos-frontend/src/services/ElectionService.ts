import axios from 'axios';
import { ELECTION_MANAGER_ABI, VOTING_CONTRACT_ABI } from '../config/contracts';
import { ethers } from 'ethers';

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

const HARDHAT_API_URL = 'http://localhost:8545';
const IPFS_API_URL = import.meta.env.VITE_IPFS_API_URL || 'http://127.0.0.1:5001/api/v0';
const IPFS_GATEWAY_URL = import.meta.env.VITE_IPFS_GATEWAY_URL || 'http://127.0.0.1:8080/ipfs';
const ELECTION_MANAGER_ADDRESS = import.meta.env.VITE_ELECTION_MANAGER_ADDRESS || '0x8a791620dd6260079bf849dc5567adc3f2fdc318';
const VOTING_CONTRACT_ADDRESS = import.meta.env.VITE_VOTING_CONTRACT_ADDRESS || '0x2279b7a0a67db372996a5fab50d91eaa73d2ebe6';

if (!ELECTION_MANAGER_ADDRESS) {
  throw new Error('VITE_ELECTION_MANAGER_ADDRESS environment variable is not set');
}

// Helper function to encode function data for ElectionManager
const encodeElectionManagerFunction = (functionName: string, types: string[], values: any[]) => {
  try {
    const iface = new ethers.Interface(ELECTION_MANAGER_ABI);
    const encodedData = iface.encodeFunctionData(functionName, values);
    
    // Ensure we have valid hex data
    if (!encodedData.startsWith('0x') || encodedData === '0x') {
      throw new Error('Invalid encoded function data');
    }
    
    return encodedData;
  } catch (error) {
    console.error('Error encoding function data:', error);
    console.log('Function:', functionName);
    console.log('Types:', types);
    console.log('Values:', values);
    throw error;
  }
};

// Helper function to encode function data for VotingContract
const encodeVotingContractFunction = (functionName: string, types: string[], values: any[]) => {
  const iface = new ethers.Interface(VOTING_CONTRACT_ABI);
  return iface.encodeFunctionData(functionName, values);
};

export const electionService = {
  async createElection(data: CreateElectionData): Promise<number> {
    try {
      console.log('Creating election with data:', data);

      // Upload to IPFS first
      const ipfsData = {
        candidates: data.candidates.map(c => ({
          ...c,
          voteCount: 0
        }))
      };
      const ipfsHash = await this.uploadToIPFS(ipfsData);
      console.log('IPFS upload successful, hash:', ipfsHash);

      // Connect to the local Hardhat network
      const provider = new ethers.JsonRpcProvider('http://localhost:8545');
      const signer = await provider.getSigner('0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266');
      
      // Create contract instance
      const electionManager = new ethers.Contract(
        ELECTION_MANAGER_ADDRESS,
        ELECTION_MANAGER_ABI,
        signer
      );

      // Prepare candidates array
      const candidates = data.candidates.map((c, index) => ({
        id: index + 1,
        name: c.name,
        description: c.description,
        voteCount: 0,
        isActive: true
      }));

      console.log('Sending transaction with:', {
        title: data.title,
        description: data.description,
        startTime: Math.floor(data.startTime / 1000),
        endTime: Math.floor(data.endTime / 1000),
        regions: data.regions,
        candidates,
        ipfsHash
      });

      // Call the contract method
      const tx = await electionManager.createElection(
        data.title,
        data.description,
        Math.floor(data.startTime / 1000),
        Math.floor(data.endTime / 1000),
        data.regions,
        candidates,
        ipfsHash,
        { gasLimit: 8000000 }
      );

      console.log('Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction receipt:', receipt);

      // Try to get the election ID from event, but don't fail if we can't
      try {
        for (const log of receipt.logs) {
          const parsedLog = electionManager.interface.parseLog({
            topics: log.topics,
            data: log.data
          });
          
          if (parsedLog?.name === 'ElectionCreated') {
            const electionId = Number(parsedLog.args[0]);
            console.log('Successfully created election with ID:', electionId);
            return electionId;
          }
        }
      } catch (e) {
        console.warn('Could not parse election ID from event, but transaction was successful');
      }

      // If we couldn't get the ID, just return 0 to indicate success
      return 0;
    } catch (error) {
      console.error('Error creating election:', error);
      throw error;
    }
  },

  async waitForTransaction(txHash: string): Promise<any> {
    const maxAttempts = 50;
    const interval = 1000; // 1 second

    for (let i = 0; i < maxAttempts; i++) {
      const response = await axios.post(HARDHAT_API_URL, {
        jsonrpc: '2.0',
        method: 'eth_getTransactionReceipt',
        params: [txHash],
        id: 1
      });

      if (response.data.result) {
        return response.data.result;
      }

      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error('Transaction not mined');
  },

  async getElections(): Promise<Election[]> {
    try {
      // Get the number of elections from VotingContract
      const lengthData = encodeVotingContractFunction('getElectionsLength', [], []);
      const lengthResponse = await axios.post(HARDHAT_API_URL, {
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{
          to: VOTING_CONTRACT_ADDRESS,
          data: lengthData
        }, 'latest'],
        id: 1
      });

      if (!lengthResponse.data.result) {
        throw new Error('Failed to get elections length');
      }

      const length = parseInt(lengthResponse.data.result, 16);
      const elections: Election[] = [];

      // Fetch each election
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
  },

  async getElection(electionId: number): Promise<Election | null> {
    try {
      // Get election data from VotingContract
      const functionData = encodeVotingContractFunction('getElection', ['uint256'], [electionId]);
      const response = await axios.post(HARDHAT_API_URL, {
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{
          to: VOTING_CONTRACT_ADDRESS,
          data: functionData
        }, 'latest'],
        id: 1
      });

      if (!response.data.result) return null;

      // Decode the response
      const iface = new ethers.Interface(VOTING_CONTRACT_ABI);
      const [id, title, description, startTime, endTime, isActive, isCompleted, totalVotes, totalEligibleVoters, regions, ipfsHash] = 
        iface.decodeFunctionResult('getElection', response.data.result);

      // Get candidates from IPFS if available
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
        startTime: Number(startTime) * 1000, // Convert from Unix timestamp
        endTime: Number(endTime) * 1000, // Convert from Unix timestamp
        isActive,
        isCompleted,
        totalVotes: Number(totalVotes),
        totalEligibleVoters: Number(totalEligibleVoters),
        regions,
        ipfsHash,
        candidates
      };
    } catch (error) {
      console.error('Error fetching election:', error);
      throw error;
    }
  },

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
  },

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
};