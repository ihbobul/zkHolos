export interface ZKPInputs {
    regionHash: string;
    electionId: string;
    voterAddress: string;
    region: string;
    isRegistered: number;
    isEligible: number;
}

export interface ZKPProof {
    pi_a: [string, string];
    pi_b: [[string, string], [string, string]];
    pi_c: [string, string];
}

export interface ZKPResult {
    proof: any; // We'll use any for now since snarkjs types are complex
    publicSignals: any[];
    calldata: string;
    electionId: number;
    commitment: string;
}

export interface VerificationResult {
    isValid: boolean;
    publicSignals: string[];
} 