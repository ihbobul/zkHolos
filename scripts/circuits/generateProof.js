const snarkjs = require("snarkjs");
const fs = require("fs");
const path = require("path");

async function generateProof(inputs) {
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

        // Convert inputs to BigInt
        const circuitInputs = {
            regionHash: BigInt(inputs.regionHash),
            electionId: BigInt(inputs.electionId),
            voterAddress: BigInt(inputs.voterAddress.replace('0x', '')),
            region: BigInt(inputs.region),
            isRegistered: BigInt(inputs.isRegistered),
            isEligible: BigInt(inputs.isEligible)
        };

        // Generate the proof
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(circuitInputs, wasmPath, zkeyPath);

        // Convert proof to Solidity calldata
        const calldata = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);

        return {
            proof,
            publicSignals,
            calldata
        };
    } catch (error) {
        console.error("Error generating proof:", error.message);
        throw error;
    }
}

// Example usage
async function main() {
    try {
        const testInputs = {
            regionHash: "123",
            electionId: "1",
            voterAddress: "0x1234567890123456789012345678901234567890",
            region: "1",
            isRegistered: 1,
            isEligible: 1
        };

        const result = await generateProof(testInputs);
        console.log("Proof generated successfully!");
        console.log("Public signals:", result.publicSignals);
        console.log("Calldata:", result.calldata);
    } catch (error) {
        console.error("Failed to generate proof:", error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { generateProof }; 