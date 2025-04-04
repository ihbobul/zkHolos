export interface ElectionData {
    id: number;
    title: string;
    description: string;
    candidates: {
        name: string;
        description: string;
    }[];
    startTime: number;
    endTime: number;
    maxVoters: number;
    regions: string[];
} 