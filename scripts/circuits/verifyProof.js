const snarkjs = require("snarkjs");
const path = require("path");

async function verifyProof(proof, publicSignals) {
    try {
        // Validate inputs
        if (!proof || !publicSignals) {
            throw new Error("Missing proof or public signals");
        }

        const vkeyPath = path.join(__dirname, "../../build/circuits/verification_key.json");

        // Load verification key
        const vKey = require(vkeyPath);

        // Verify the proof
        const isValid = await snarkjs.groth16.verify(vKey, publicSignals, proof);

        return {
            isValid,
            publicSignals
        };
    } catch (error) {
        console.error("Error verifying proof:", error.message);
        throw error;
    }
}

// Example usage
async function main() {
    try {
        // This is just an example - in real usage, you would get these from your application
        const exampleProof = {
            pi_a: ["0x...", "0x..."],
            pi_b: [["0x...", "0x..."], ["0x...", "0x..."]],
            pi_c: ["0x...", "0x..."]
        };

        const examplePublicSignals = ["0x...", "0x..."];

        const result = await verifyProof(exampleProof, examplePublicSignals);
        console.log("Proof verification result:", result.isValid ? "VALID" : "INVALID");
        console.log("Public signals:", result.publicSignals);
    } catch (error) {
        console.error("Failed to verify proof:", error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { verifyProof }; 