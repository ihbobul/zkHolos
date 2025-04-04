export interface ElectionData {
    id: number;
    title: string;
    description: string;
    startTime: number;
    endTime: number;
    regions: string[];
    candidates: Candidate[];
}

export interface Candidate {
    id: number;
    name: string;
    description: string;
    voteCount: number;
    isActive: boolean;
}

export interface VoteRecord {
    electionId: number;
    candidateId: number;
    region: string;
    voter: string;
    timestamp: number;
    commitment: string;
} 