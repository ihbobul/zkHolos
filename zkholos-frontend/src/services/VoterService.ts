import { ethers } from 'ethers';
import { VOTER_REGISTRATION_ABI } from '../config/contracts';

const HARDHAT_API_URL = 'http://localhost:8545';
const VOTER_REGISTRATION_ADDRESS = import.meta.env.VITE_VOTER_REGISTRATION_ADDRESS || '0x0000000000000000000000000000000000000000';

export interface Voter {
  region: string;
  isRegistered: boolean;
  isEligible: boolean;
  registrationTime: number;
}

export interface ZKProof {
  a: [string, string];
  b: [[string, string], [string, string]];
  c: [string, string];
  input: [string, string];
}

export const voterService = {
  async registerVoter(region: string, proof: ZKProof): Promise<void> {
    try {
      const provider = new ethers.JsonRpcProvider(HARDHAT_API_URL);
      const signer = await provider.getSigner();
      
      const contract = new ethers.Contract(
        VOTER_REGISTRATION_ADDRESS,
        VOTER_REGISTRATION_ABI,
        signer
      );

      const tx = await contract.registerVoter(
        region,
        proof.a,
        proof.b,
        proof.c,
        proof.input,
        { gasLimit: 500000 }
      );

      await tx.wait();
    } catch (error) {
      console.error('Error registering voter:', error);
      throw error;
    }
  },

  async getVoterInfo(address: string): Promise<Voter> {
    try {
      const provider = new ethers.JsonRpcProvider(HARDHAT_API_URL);
      const contract = new ethers.Contract(
        VOTER_REGISTRATION_ADDRESS,
        VOTER_REGISTRATION_ABI,
        provider
      );

      const [region, isRegistered, isEligible, registrationTime] = await contract.getVoterInfo(address);
      
      return {
        region,
        isRegistered,
        isEligible,
        registrationTime: Number(registrationTime) * 1000 // Convert to milliseconds
      };
    } catch (error) {
      console.error('Error getting voter info:', error);
      throw error;
    }
  },

  async getRegionVoterCount(region: string): Promise<number> {
    try {
      const provider = new ethers.JsonRpcProvider(HARDHAT_API_URL);
      const contract = new ethers.Contract(
        VOTER_REGISTRATION_ADDRESS,
        VOTER_REGISTRATION_ABI,
        provider
      );

      const count = await contract.getRegionVoterCount(region);
      return Number(count);
    } catch (error) {
      console.error('Error getting region voter count:', error);
      throw error;
    }
  },

  async getRegisteredVoters(): Promise<string[]> {
    try {
      const provider = new ethers.JsonRpcProvider(HARDHAT_API_URL);
      const contract = new ethers.Contract(
        VOTER_REGISTRATION_ADDRESS,
        VOTER_REGISTRATION_ABI,
        provider
      );

      return await contract.getRegisteredVoters();
    } catch (error) {
      console.error('Error getting registered voters:', error);
      throw error;
    }
  },

  async isRegistered(address: string): Promise<boolean> {
    try {
      const provider = new ethers.JsonRpcProvider(HARDHAT_API_URL);
      const contract = new ethers.Contract(
        VOTER_REGISTRATION_ADDRESS,
        VOTER_REGISTRATION_ABI,
        provider
      );

      return await contract.isRegistered(address);
    } catch (error) {
      console.error('Error checking registration status:', error);
      throw error;
    }
  },

  async isEligible(address: string): Promise<boolean> {
    try {
      const provider = new ethers.JsonRpcProvider(HARDHAT_API_URL);
      const contract = new ethers.Contract(
        VOTER_REGISTRATION_ADDRESS,
        VOTER_REGISTRATION_ABI,
        provider
      );

      return await contract.isEligible(address);
    } catch (error) {
      console.error('Error checking eligibility status:', error);
      throw error;
    }
  }
}; 