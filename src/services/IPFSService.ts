import * as dotenv from 'dotenv';
import fetch from 'node-fetch';
import FormData from 'form-data';

dotenv.config();

export class IPFSService {
    private apiUrl: string;
    private static instance: IPFSService;

    private constructor() {
        const host = process.env.IPFS_HOST || '127.0.0.1';
        const port = process.env.IPFS_PORT || '5001';
        const protocol = process.env.IPFS_PROTOCOL || 'http';
        this.apiUrl = `${protocol}://${host}:${port}/api/v0`;
    }

    public static getInstance(): IPFSService {
        if (!IPFSService.instance) {
            IPFSService.instance = new IPFSService();
        }
        return IPFSService.instance;
    }

    /**
     * Upload data to IPFS
     * @param data The data to upload (can be string, Buffer, or Uint8Array)
     * @returns The IPFS hash (CID) of the uploaded data
     */
    public async upload(data: string | Buffer | Uint8Array): Promise<string> {
        try {
            const form = new FormData();
            const buffer = Buffer.from(data.toString());
            form.append('file', buffer);

            const response = await fetch(`${this.apiUrl}/add`, {
                method: 'POST',
                body: form,
                headers: form.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result.Hash;
        } catch (error) {
            console.error('Error uploading to IPFS:', error);
            throw error;
        }
    }

    /**
     * Retrieve data from IPFS
     * @param hash The IPFS hash (CID) of the data to retrieve
     * @returns The retrieved data as a string
     */
    public async retrieve(hash: string): Promise<string> {
        try {
            const response = await fetch(`${this.apiUrl}/cat?arg=${hash}`, {
                method: 'POST'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.text();
        } catch (error) {
            console.error('Error retrieving from IPFS:', error);
            throw error;
        }
    }

    /**
     * Check if the IPFS node is running and accessible
     * @returns boolean indicating if the node is accessible
     */
    public async isNodeAvailable(): Promise<boolean> {
        try {
            const response = await fetch(`${this.apiUrl}/version`, {
                method: 'POST'
            });

            if (!response.ok) {
                return false;
            }

            const version = await response.json();
            return !!version.Version;
        } catch (error) {
            console.error('IPFS node is not available:', error);
            return false;
        }
    }
} 