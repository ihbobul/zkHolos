import * as chai from "chai";
const { expect } = chai;
import { generateProof } from "../../scripts/circuits/generateProof";
import { ZKPInputs } from "../../scripts/circuits/types";
import * as snarkjs from "snarkjs";
import * as path from "path";

describe("Voter Eligibility Circuit", function () {
    it("should generate and verify a valid proof", async function () {
        const inputs: ZKPInputs = {
            regionHash: "123",
            electionId: "1",
            voterAddress: "0x1234567890123456789012345678901234567890",
            region: "1",
            isRegistered: 1,
            isEligible: 1
        };

        try {
            // Generate proof
            const proof = await generateProof(inputs);
            expect(proof).to.not.be.null;
            expect(proof.proof).to.not.be.null;
            expect(proof.publicSignals).to.not.be.null;
            expect(proof.calldata).to.not.be.null;

            // Verify proof using snarkjs directly
            const vKeyPath = path.join(__dirname, "../../build/circuits/verification_key.json");
            const vKey = require(vKeyPath);
            const isValid = await snarkjs.groth16.verify(vKey, proof.publicSignals, proof.proof);
            expect(isValid).to.be.true;
        } catch (error) {
            console.error("Error in proof generation/verification:", error);
            throw error;
        }
    });

    it("should reject invalid inputs", async function () {
        const invalidInputs: ZKPInputs = {
            regionHash: "",
            electionId: "",
            voterAddress: "",
            region: "",
            isRegistered: 2, // Invalid value
            isEligible: 2    // Invalid value
        };

        try {
            await generateProof(invalidInputs);
            expect.fail("Should have thrown an error for invalid inputs");
        } catch (error: unknown) {
            expect(error).to.be.an("Error");
            if (error instanceof Error) {
                expect(error.message).to.include("Missing required inputs");
            }
        }
    });
}); 