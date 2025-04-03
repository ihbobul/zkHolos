// import snarkjs from "snarkjs";
// import fs from "fs";
// import path from "path";
// import { ZKPResult } from "./types";

// export async function verifyProof(proof: ZKPResult): Promise<boolean> {
//     try {
//         const vKeyPath = path.join(__dirname, "../../build/circuits/verification_key.json");

//         // Check if verification key exists
//         if (!fs.existsSync(vKeyPath)) {
//             throw new Error("Verification key not found. Please run circuits:setup first.");
//         }

//         // Load verification key
//         const vKey = JSON.parse(fs.readFileSync(vKeyPath, "utf8"));

//         // Verify the proof
//         const isValid = await snarkjs.groth16.verify(vKey, proof.publicSignals, proof.proof);
//         return isValid;
//     } catch (error) {
//         console.error("Error verifying proof:", error instanceof Error ? error.message : String(error));
//         throw error;
//     }
// }

// // Example usage
// async function main() {
//     try {
//         // This would typically come from your application
//         const testProof: ZKPResult = {
//             proof: {
//                 pi_a: ["0", "0", "0"],
//                 pi_b: [["0", "0"], ["0", "0"], ["0", "0"]],
//                 pi_c: ["0", "0", "0"],
//                 protocol: "groth16",
//                 curve: "bn128"
//             },
//             publicSignals: ["0"],
//             calldata: "0x"
//         };

//         const isValid = await verifyProof(testProof);
//         console.log("Proof verification result:", isValid);
//     } catch (error) {
//         console.error("Failed to verify proof:", error instanceof Error ? error.message : String(error));
//         process.exit(1);
//     }
// }

// if (require.main === module) {
//     main();
// } 