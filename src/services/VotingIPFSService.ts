import { IPFSService } from './IPFSService';
import { ElectionData, VoteRecord } from '../types/voting';

export class VotingIPFSService {
    private ipfsService: IPFSService;
    private static instance: VotingIPFSService;

    private constructor() {
        this.ipfsService = IPFSService.getInstance();
    }

    public static getInstance(): VotingIPFSService {
        if (!VotingIPFSService.instance) {
            VotingIPFSService.instance = new VotingIPFSService();
        }
        return VotingIPFSService.instance;
    }

    /**
     * Store election data on IPFS
     * @param data The election data to store
     * @returns The IPFS hash of the stored data
     */
    public async storeElectionData(data: ElectionData): Promise<string> {
        try {
            const jsonData = JSON.stringify(data);
            return await this.ipfsService.upload(jsonData);
        } catch (error) {
            console.error('Error storing election data on IPFS:', error);
            throw error;
        }
    }

    /**
     * Retrieve election data from IPFS
     * @param hash The IPFS hash of the election data
     * @returns The retrieved election data
     */
    public async retrieveElectionData(hash: string): Promise<ElectionData> {
        try {
            const data = await this.ipfsService.retrieve(hash);
            return JSON.parse(data);
        } catch (error) {
            console.error('Error retrieving election data from IPFS:', error);
            throw error;
        }
    }

    /**
     * Store a vote record on IPFS
     * @param record The vote record to store
     * @returns The IPFS hash of the stored vote record
     */
    public async storeVoteRecord(record: VoteRecord): Promise<string> {
        try {
            const jsonData = JSON.stringify(record);
            return await this.ipfsService.upload(jsonData);
        } catch (error) {
            console.error('Error storing vote record on IPFS:', error);
            throw error;
        }
    }

    /**
     * Retrieve a vote record from IPFS
     * @param hash The IPFS hash of the vote record
     * @returns The retrieved vote record
     */
    public async getVoteRecord(hash: string): Promise<VoteRecord> {
        try {
            const data = await this.ipfsService.retrieve(hash);
            return JSON.parse(data) as VoteRecord;
        } catch (error) {
            console.error('Error retrieving vote record from IPFS:', error);
            throw error;
        }
    }

    /**
     * Store multiple vote records on IPFS
     * @param voteRecords Array of vote records to store
     * @returns The IPFS hash of the stored vote records
     */
    public async storeVoteRecords(voteRecords: VoteRecord[]): Promise<string> {
        try {
            const data = JSON.stringify(voteRecords);
            const hash = await this.ipfsService.upload(data);
            return hash;
        } catch (error) {
            console.error('Error storing vote records on IPFS:', error);
            throw error;
        }
    }

    /**
     * Retrieve multiple vote records from IPFS
     * @param hash The IPFS hash of the vote records
     * @returns The retrieved vote records
     */
    public async retrieveVoteRecords(hash: string): Promise<VoteRecord[]> {
        try {
            const data = await this.ipfsService.retrieve(hash);
            return JSON.parse(data);
        } catch (error) {
            console.error('Error retrieving vote records from IPFS:', error);
            throw error;
        }
    }
} 