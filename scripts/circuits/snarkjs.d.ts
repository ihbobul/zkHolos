declare module 'snarkjs' {
    interface Proof {
        pi_a: [string, string, string];
        pi_b: [[string, string], [string, string], [string, string]];
        pi_c: [string, string, string];
        protocol: string;
        curve: string;
    }

    interface Groth16 {
        fullProve(input: any, wasmFile: string, zkeyFile: string): Promise<{
            proof: Proof;
            publicSignals: any[];
        }>;
        exportSolidityCallData(proof: Proof, publicSignals: any[]): Promise<string>;
        verify(vKey: any, publicSignals: any[], proof: Proof): Promise<boolean>;
    }

    const groth16: Groth16;
    export { groth16 };
} 