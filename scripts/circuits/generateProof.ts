import snarkjs from "snarkjs";
import fs from "fs";
import path from "path";
import { ZKPInputs, ZKPResult } from "./types";

export async function generateProof(inputs: ZKPInputs): Promise<ZKPResult> {
    try {
        // Validate inputs
        if (!inputs.regionHash || !inputs.electionId || !inputs.voterAddress || 
            !inputs.region || inputs.isRegistered === undefined || inputs.isEligible === undefined) {
            throw new Error("Missing required inputs");
        }

        // Ensure binary inputs are valid
        if (![0, 1].includes(inputs.isRegistered) || ![0, 1].includes(inputs.isEligible)) {
            throw new Error("isRegistered and isEligible must be 0 or 1");
        }

        const wasmPath = path.join(__dirname, "../../build/circuits/VoterEligibility.wasm");
        const zkeyPath = path.join(__dirname, "../../build/circuits/VoterEligibility_final.zkey");

        // Check if required files exist
        if (!fs.existsSync(wasmPath) || !fs.existsSync(zkeyPath)) {
            throw new Error("Circuit files not found. Please run circuits:compile and circuits:setup first.");
        }

        // Generate the proof
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(inputs, wasmPath, zkeyPath);

        // Convert proof to Solidity calldata
        const calldata = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);

        return {
            proof,
            publicSignals,
            calldata,
            electionId: Number(inputs.electionId),
            commitment: inputs.voterAddress
        };
    } catch (error) {
        console.error("Error generating proof:", error instanceof Error ? error.message : String(error));
        throw error;
    }
}

// Example usage
async function main() {
    try {
        const testInputs: ZKPInputs = {
            regionHash: "1234567890",
            electionId: "1",
            voterAddress: "0x1234567890123456789012345678901234567890",
            region: "US",
            isRegistered: 1,
            isEligible: 1
        };

        const result = await generateProof(testInputs);
        console.log("Proof generated successfully!");
        console.log("Public signals:", result.publicSignals);
        console.log("Calldata:", result.calldata);
    } catch (error) {
        console.error("Failed to generate proof:", error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}

if (require.main === module) {
    main();
} 