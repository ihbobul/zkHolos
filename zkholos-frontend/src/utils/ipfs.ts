import { create } from 'ipfs-http-client';

// Create IPFS client instance
const ipfs = create({ url: import.meta.env.VITE_IPFS_API_URL || 'http://localhost:5001/api/v0' });

// Interface for election data stored in IPFS
export interface IPFSElectionData {
  candidates: {
    id: number;
    name: string;
    description: string;
    voteCount: number;
    isActive: boolean;
  }[];
  additionalDetails?: {
    organizerInfo?: string;
    rules?: string;
    requirements?: string;
  };
}

/**
 * Upload election data to IPFS
 * @param data Election data to store
 * @returns IPFS hash (CID) of the uploaded content
 */
export async function uploadToIPFS(data: IPFSElectionData): Promise<string> {
  try {
    const jsonString = JSON.stringify(data);
    const { cid } = await ipfs.add(jsonString);
    return cid.toString();
  } catch (error: any) {
    console.error('Error uploading to IPFS:', error);
    throw new Error(`Failed to upload to IPFS: ${error.message}`);
  }
}

/**
 * Fetch election data from IPFS
 * @param hash IPFS hash (CID) to fetch data from
 * @returns Parsed election data
 */
export async function fetchFromIPFS(hash: string): Promise<IPFSElectionData> {
  try {
    const chunks = [];
    for await (const chunk of ipfs.cat(hash)) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    const data = JSON.parse(buffer.toString('utf8'));
    return data;
  } catch (error: any) {
    console.error('Error fetching from IPFS:', error);
    throw new Error(`Failed to fetch from IPFS: ${error.message}`);
  }
}

/**
 * Pin content to IPFS to ensure persistence
 * @param hash IPFS hash (CID) to pin
 */
export async function pinToIPFS(hash: string): Promise<void> {
  try {
    await ipfs.pin.add(hash);
  } catch (error: any) {
    console.error('Error pinning to IPFS:', error);
    throw new Error(`Failed to pin to IPFS: ${error.message}`);
  }
}

/**
 * Check if IPFS node is available
 * @returns true if IPFS node is reachable
 */
export async function checkIPFSConnection(): Promise<boolean> {
  try {
    const { id } = await ipfs.id();
    return !!id;
  } catch (error) {
    console.error('IPFS node not available:', error);
    return false;
  }
} 