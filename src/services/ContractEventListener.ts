import { ethers } from 'ethers';
import { VotingIPFSService } from './VotingIPFSService';

// Define contract event types
interface ElectionCreatedEvent {
    electionId: bigint;
    title: string;
    description: string;
    startTime: bigint;
    endTime: bigint;
    regions: string[];
    ipfsHash: string;
}

interface VoteCastEvent {
    electionId: bigint;
    candidateId: bigint;
    region: string;
    voter: string;
    commitment?: string;
}

export class ContractEventListener {
    private provider: ethers.Provider;
    private contract: ethers.Contract;
    private ipfsService: VotingIPFSService;

    constructor(
        provider: ethers.Provider,
        contractAddress: string,
        contractAbi: any
    ) {
        this.provider = provider;
        this.contract = new ethers.Contract(
            contractAddress,
            contractAbi,
            provider
        );
        this.ipfsService = VotingIPFSService.getInstance();
    }

    public async startListening() {
        console.log('Starting contract event listener...');

        // Listen for ElectionCreated events
        this.contract.on('ElectionCreated', async (
            electionId: bigint,
            title: string,
            description: string,
            startTime: bigint,
            endTime: bigint,
            regions: string[],
            ipfsHash: string,
            event: ethers.EventLog
        ) => {
            console.log(`New election created: ${title}`);
            
            try {
                // Store election data on IPFS
                const electionData = {
                    id: Number(electionId),
                    title,
                    description,
                    startTime: Number(startTime),
                    endTime: Number(endTime),
                    regions,
                    candidates: [], // Will be populated when candidates are added
                };

                const storedHash = await this.ipfsService.storeElectionData(electionData);
                console.log(`Election data stored on IPFS with hash: ${storedHash}`);
            } catch (error) {
                console.error('Error storing election data on IPFS:', error);
            }
        });

        // Listen for VoteCast events
        this.contract.on('VoteCast', async (
            electionId: bigint,
            candidateId: bigint,
            region: string,
            event: ethers.EventLog
        ) => {
            console.log(`Vote cast in election ${electionId} for candidate ${candidateId} in region ${region}`);
            
            try {
                // Store vote record on IPFS
                const voteRecord = {
                    electionId: Number(electionId),
                    candidateId: Number(candidateId),
                    region,
                    voter: (event as any).args.voter,
                    timestamp: Math.floor(Date.now() / 1000),
                    commitment: (event as any).args.commitment || '0x0'
                };

                const storedHash = await this.ipfsService.storeVoteRecord(voteRecord);
                console.log(`Vote record stored on IPFS with hash: ${storedHash}`);
            } catch (error) {
                console.error('Error storing vote record on IPFS:', error);
            }
        });
    }

    public async stopListening() {
        this.contract.removeAllListeners();
        console.log('Contract event listener stopped');
    }
} 