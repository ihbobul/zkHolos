import axios from 'axios';

const IPFS_API_URL = 'http://localhost:5001/api/v0';
const HARDHAT_API_URL = 'http://localhost:8545';

export interface IPFSResponse {
  Hash: string;
  Name: string;
  Size: string;
}

export const ipfsService = {
  async uploadToIPFS(data: any): Promise<string> {
    try {
      const formData = new FormData();
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      formData.append('file', blob);

      const response = await axios.post(`${IPFS_API_URL}/add`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data.Hash;
    } catch (error) {
      console.error('Error uploading to IPFS:', error);
      throw error;
    }
  },

  async getFromIPFS(hash: string): Promise<any> {
    try {
      const response = await axios.post(`${IPFS_API_URL}/cat?arg=${hash}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching from IPFS:', error);
      throw error;
    }
  },
};

export const contractService = {
  async getElections() {
    try {
      const response = await axios.post(HARDHAT_API_URL, {
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [
          {
            to: process.env.VITE_VOTING_CONTRACT_ADDRESS,
            data: '0x0' // We'll add the actual method signature here
          },
          'latest'
        ],
        id: 1
      });
      return response.data.result;
    } catch (error) {
      console.error('Error fetching elections:', error);
      throw error;
    }
  },

  async getElectionDetails(electionId: number) {
    try {
      const response = await axios.post(HARDHAT_API_URL, {
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [
          {
            to: process.env.VITE_VOTING_CONTRACT_ADDRESS,
            data: '0x0' // We'll add the actual method signature here
          },
          'latest'
        ],
        id: 1
      });
      return response.data.result;
    } catch (error) {
      console.error('Error fetching election details:', error);
      throw error;
    }
  }
}; 