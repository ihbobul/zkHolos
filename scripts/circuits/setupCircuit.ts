import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function compileCircuit(): Promise<void> {
    try {
        const circuitPath = path.join(__dirname, "../../circuits/VoterEligibility.circom");
        const buildDir = path.join(__dirname, "../../build/circuits");

        // Create build directory if it doesn't exist
        if (!fs.existsSync(buildDir)) {
            fs.mkdirSync(buildDir, { recursive: true });
        }

        // Compile the circuit
        console.log("Compiling circuit...");
        await execAsync(`circom ${circuitPath} --r1cs --wasm --sym --c --output ${buildDir}`);

        console.log("Circuit compiled successfully!");
    } catch (error) {
        console.error("Error compiling circuit:", error instanceof Error ? error.message : String(error));
        throw error;
    }
}

export async function generatePowersOfTau(): Promise<void> {
    try {
        const buildDir = path.join(__dirname, "../../build/circuits");
        
        // Generate powers of tau
        console.log("Generating powers of tau...");
        await execAsync(`snarkjs powersoftau new bn128 12 ${buildDir}/pot12_0000.ptau -v`);
        
        // Contribute to the ceremony
        console.log("Contributing to the ceremony...");
        await execAsync(`snarkjs powersoftau contribute ${buildDir}/pot12_0000.ptau ${buildDir}/pot12_0001.ptau --name="First contribution" -v`);
        
        // Prepare phase 2
        console.log("Preparing phase 2...");
        await execAsync(`snarkjs powersoftau prepare phase2 ${buildDir}/pot12_0001.ptau ${buildDir}/pot12_final.ptau -v`);
        
        console.log("Powers of tau generated successfully!");
    } catch (error) {
        console.error("Error generating powers of tau:", error instanceof Error ? error.message : String(error));
        throw error;
    }
}

export async function setupCircuit(): Promise<void> {
    try {
        const buildDir = path.join(__dirname, "../../build/circuits");
        const r1csPath = path.join(buildDir, "VoterEligibility.r1cs");
        const potPath = path.join(buildDir, "pot12_final.ptau");

        // Check if required files exist
        if (!fs.existsSync(r1csPath)) {
            throw new Error("R1CS file not found. Please run compileCircuit first.");
        }
        if (!fs.existsSync(potPath)) {
            throw new Error("Powers of tau file not found. Please run generatePowersOfTau first.");
        }

        // Generate the proving key
        console.log("Generating proving key...");
        await execAsync(`snarkjs groth16 setup ${r1csPath} ${potPath} ${buildDir}/VoterEligibility_0000.zkey`);

        // Contribute to the ceremony
        console.log("Contributing to the ceremony...");
        await execAsync(`snarkjs zkey contribute ${buildDir}/VoterEligibility_0000.zkey ${buildDir}/VoterEligibility_final.zkey --name="1st Contributor" -v`);

        // Export verification key
        console.log("Exporting verification key...");
        await execAsync(`snarkjs zkey export verificationkey ${buildDir}/VoterEligibility_final.zkey ${buildDir}/verification_key.json`);

        // Export verifier contract
        console.log("Exporting verifier contract...");
        await execAsync(`snarkjs zkey export solidityverifier ${buildDir}/VoterEligibility_final.zkey ${buildDir}/VoterEligibilityVerifier.sol`);

        console.log("Circuit setup completed successfully!");
    } catch (error) {
        console.error("Error setting up circuit:", error instanceof Error ? error.message : String(error));
        throw error;
    }
}

// Example usage
async function main() {
    const command = process.argv[2];
    try {
        switch (command) {
            case "compile":
                await compileCircuit();
                break;
            case "pot":
                await generatePowersOfTau();
                break;
            case "setup":
                await setupCircuit();
                break;
            default:
                console.error("Invalid command. Use 'compile', 'pot', or 'setup'");
                process.exit(1);
        }
    } catch (error) {
        console.error("Failed to execute command:", error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}

if (require.main === module) {
    main();
} 