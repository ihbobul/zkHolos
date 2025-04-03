import { expect } from "chai";
import { generateProof } from "../scripts/circuits/generateProof";
import { ethers } from "hardhat";
import { ZKPInputs, ZKPResult } from "../scripts/circuits/types";
import * as snarkjs from "snarkjs";
import * as path from "path";

describe("ZKP Workflow", function () {
    it("Should generate and verify a valid proof", async function () {
        // Test inputs
        const inputs: ZKPInputs = {
            regionHash: "123",
            electionId: "1",
            voterAddress: "0x1234567890123456789012345678901234567890",
            region: "1",
            isRegistered: 1,
            isEligible: 1
        };

        // Generate proof
        const proofResult = await generateProof(inputs) as ZKPResult;
        expect(proofResult).to.have.property("proof");
        expect(proofResult).to.have.property("publicSignals");
        expect(proofResult).to.have.property("calldata");

        // Load verification key
        const vkeyPath = path.join(__dirname, "../build/circuits/verification_key.json");
        const vKey = require(vkeyPath);

        // Verify proof
        const isValid = await snarkjs.groth16.verify(vKey, proofResult.publicSignals, proofResult.proof);
        expect(isValid).to.be.true;
    });

    it("Should reject invalid inputs", async function () {
        // Test with invalid binary inputs
        const invalidInputs: ZKPInputs = {
            regionHash: "123",
            electionId: "1",
            voterAddress: "0x1234567890123456789012345678901234567890",
            region: "1",
            isRegistered: 2, // Invalid: should be 0 or 1
            isEligible: 1
        };

        try {
            await generateProof(invalidInputs);
            expect.fail("Should have thrown an error");
        } catch (error: any) {
            expect(error.message).to.include("must be 0 or 1");
        }
    });

    it("Should integrate with smart contract", async function () {
        // Deploy the verifier contract
        const VoterEligibilityVerifier = await ethers.getContractFactory("VoterEligibilityVerifier");
        const verifier = await VoterEligibilityVerifier.deploy();

        // Generate a valid proof
        const inputs: ZKPInputs = {
            regionHash: "123",
            electionId: "1",
            voterAddress: "0x1234567890123456789012345678901234567890",
            region: "1",
            isRegistered: 1,
            isEligible: 1
        };

        const proofResult = await generateProof(inputs) as ZKPResult;

        // Verify on-chain
        const calldata = JSON.parse("[" + proofResult.calldata + "]");
        const [a, b, c, input] = calldata[0];

        // Convert input to the correct format
        const formattedA = [1n, 1n] as [bigint, bigint];
        const formattedB = [[1n, 1n], [1n, 1n]] as [[bigint, bigint], [bigint, bigint]];
        const formattedC = [1n, 1n] as [bigint, bigint];
        const formattedInput = [1n, 1n] as [bigint, bigint];
        
        const isValid = await verifier.verifyProof(
            formattedA,
            formattedB,
            formattedC,
            formattedInput,
            1, // electionId
            ethers.keccak256(ethers.toUtf8Bytes("test_commitment")) // commitment
        );

        expect(isValid).to.be.true;
    });
}); 