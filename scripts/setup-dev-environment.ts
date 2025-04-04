import { ethers } from "hardhat";
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { VoterRegistration } from "../typechain-types/contracts/VoterRegistration";
import { ElectionManager } from "../typechain-types/contracts/ElectionManager";
import { MockZKPVerifier } from "../typechain-types/contracts/MockZKPVerifier";
import { VotingContract } from "../typechain-types/contracts/VotingContract";
import { EventLog } from "ethers";
import { create } from 'kubo-rpc-client';
import axios from 'axios';

// Define the ZKP proof parameter types
interface ZKProofParams {
  a: [number, number];
  b: [[number, number], [number, number]];
  c: [number, number];
  input: [number, number];
}

// Create IPFS client
const ipfs = create({ url: 'http://127.0.0.1:5001/api/v0' });

// Configure IPFS CORS
async function configureIPFSCors() {
  try {
    console.log('\nConfiguring IPFS CORS...');
    
    // Configure CORS with more permissive settings
    execSync('ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin \'["*"]\'');
    execSync('ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods \'["GET", "POST", "PUT", "OPTIONS", "DELETE"]\'');
    execSync('ipfs config --json API.HTTPHeaders.Access-Control-Allow-Headers \'["X-Requested-With", "Access-Control-Expose-Headers", "Access-Control-Allow-Origin", "Access-Control-Allow-Headers", "Access-Control-Allow-Methods", "Content-Type", "Authorization"]\'');
    execSync('ipfs config --json API.HTTPHeaders.Access-Control-Expose-Headers \'["Location", "Access-Control-Allow-Origin", "Access-Control-Allow-Headers", "Access-Control-Allow-Methods"]\'');
    execSync('ipfs config --json API.HTTPHeaders.Access-Control-Allow-Credentials \'["true"]\'');
    
    console.log('✅ IPFS CORS configured successfully');
  } catch (error) {
    console.error('❌ Error configuring IPFS CORS:', error);
    throw error;
  }
}

async function storeElectionDataInIPFS(title: string, description: string, candidates: any[]) {
  const electionData = {
    title,
    description,
    candidates,
    additionalDetails: {
      organizerInfo: 'Created via zkHolos platform',
      rules: 'One vote per registered voter',
      requirements: 'Must be a registered voter'
    },
    metadata: {
      createdAt: new Date().toISOString(),
      version: '1.0.0'
    }
  };

  try {
    // Convert the data to a Buffer
    const buffer = Buffer.from(JSON.stringify(electionData));
    
    // Add the data to IPFS
    const result = await ipfs.add(buffer);
    console.log(`\nStoring election data in IPFS...`);
    console.log(`Data:`, JSON.stringify(electionData, null, 2));
    console.log(`Hash: ${result.path}`);
    
    // Pin the data to ensure it persists
    await ipfs.pin.add(result.path);
    console.log(`Pinned data with hash: ${result.path}`);
    
    // Verify the data was stored correctly by reading it back
    let retries = 3;
    let success = false;
    
    while (retries > 0 && !success) {
      try {
        // First verify through IPFS API
        const chunks = [];
        for await (const chunk of ipfs.cat(result.path)) {
          chunks.push(chunk);
        }
        const storedData = Buffer.concat(chunks).toString();
        const parsedData = JSON.parse(storedData);
        
        if (JSON.stringify(parsedData) === JSON.stringify(electionData)) {
          console.log('✅ Data verified in IPFS');
          
          // Then verify through gateway
          try {
            const gatewayUrl = `http://127.0.0.1:8080/ipfs/${result.path}`;
            const response = await axios.get(gatewayUrl);
            if (response.status === 200) {
              console.log('✅ Data accessible through gateway');
              success = true;
              break;
            }
          } catch (gatewayError) {
            console.warn(`Warning: Data not yet accessible through gateway, retrying... (${retries} attempts left)`);
          }
        }
      } catch (error) {
        console.warn(`Warning: Verification attempt failed, retrying... (${retries} attempts left)`);
      }
      
      retries--;
      if (!success && retries > 0) {
        console.log('Waiting before next retry...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retrying
      }
    }
    
    if (!success) {
      throw new Error('Failed to verify data accessibility after all retries');
    }
    
    return result.path;
  } catch (error) {
    console.error('\n❌ Error storing data in IPFS:', error);
    throw error;
  }
}

async function createTestElection(electionManager: ElectionManager, title: string, description: string, regions: string[]) {
  // Get current block timestamp
  const currentBlock = await ethers.provider.getBlock('latest');
  if (!currentBlock) throw new Error("Failed to get current block");
  
  const startTime = currentBlock.timestamp + 120; // starts in 2 minutes
  const endTime = startTime + 7200; // ends in 2 hours

  const candidates = [
    {
      id: 1,
      name: `Candidate 1 - ${title}`,
      description: "First candidate",
      voteCount: 0,
      isActive: true
    },
    {
      id: 2,
      name: `Candidate 2 - ${title}`,
      description: "Second candidate",
      voteCount: 0,
      isActive: true
    }
  ];

  console.log(`Creating election: ${title}`);
  
  // Store election data in IPFS
  console.log('Storing election data in IPFS...');
  const ipfsHash = await storeElectionDataInIPFS(title, description, candidates);
  console.log(`Election data stored with hash: ${ipfsHash}`);

  const tx = await electionManager.createElection(
    title,
    description,
    startTime,
    endTime,
    regions,
    candidates,
    ipfsHash
  );
  const receipt = await tx.wait();
  if (!receipt) throw new Error("Failed to get transaction receipt");
  
  // Get the election ID from the event
  const event = receipt.logs.find(
    (log): log is EventLog => log instanceof EventLog && log.fragment.name === "ElectionCreated"
  );
  if (!event) throw new Error("ElectionCreated event not found");
  
  const electionId = event.args[0];

  // Update eligible voters
  await electionManager.updateEligibleVoters(electionId);
  
  // Advance time to just after start time
  console.log(`Advancing time for election ${title}...`);
  await ethers.provider.send("evm_increaseTime", [125]); // Advance time by 125 seconds (a bit more than 2 minutes)
  await ethers.provider.send("evm_mine", []); // Mine a new block

  // Start the election
  console.log(`Starting election: ${title}`);
  await electionManager.startElectionPhase(electionId);

  // Cast some test votes
  const [, voter1, voter2, voter3] = await ethers.getSigners();
  const zkProofParams: ZKProofParams = {
    a: [1, 2],
    b: [[3, 4], [5, 6]],
    c: [7, 8],
    input: [9, 10]
  };

  // Cast votes with different patterns for each election
  console.log(`Casting votes for election: ${title}`);
  await electionManager.connect(voter1).castVoteWithProof(
    electionId,
    1, // voting for candidate 1
    zkProofParams.a,
    zkProofParams.b,
    zkProofParams.c,
    zkProofParams.input
  );

  await electionManager.connect(voter2).castVoteWithProof(
    electionId,
    2, // voting for candidate 2
    zkProofParams.a,
    zkProofParams.b,
    zkProofParams.c,
    zkProofParams.input
  );

  await electionManager.connect(voter3).castVoteWithProof(
    electionId,
    Math.random() > 0.5 ? 1 : 2, // random vote
    zkProofParams.a,
    zkProofParams.b,
    zkProofParams.c,
    zkProofParams.input
  );

  console.log(`Election ${title} created with ID ${electionId} and votes cast`);
  return electionId;
}

async function updateEnvFile(contracts: any) {
  try {
    // Get the absolute path to the frontend .env file
    const envPath = path.join(process.cwd(), 'zkholos-frontend', '.env');
    console.log('\nUpdating environment variables:');
    console.log('Target .env path:', envPath);
    
    const envContent = `# Contract addresses for local Hardhat network
VITE_ELECTION_MANAGER_ADDRESS=${contracts.electionManager}
VITE_VOTING_CONTRACT_ADDRESS=${contracts.votingContract}
VITE_VOTER_REGISTRATION_ADDRESS=${contracts.voterRegistration}
VITE_MOCK_ZKP_VERIFIER_ADDRESS=${contracts.mockVerifier}

# IPFS configuration
VITE_IPFS_API_URL=http://127.0.0.1:5001/api/v0
VITE_IPFS_GATEWAY_URL=http://127.0.0.1:8080/ipfs
VITE_IPFS_PROJECT_ID=local
VITE_IPFS_PROJECT_SECRET=local-secret`;

    // Create the frontend directory if it doesn't exist
    const frontendDir = path.dirname(envPath);
    if (!fs.existsSync(frontendDir)) {
      console.log('Creating frontend directory:', frontendDir);
      fs.mkdirSync(frontendDir, { recursive: true });
    }

    // Debug: Show previous content if file exists
    if (fs.existsSync(envPath)) {
      console.log('\nPrevious .env content:');
      console.log(fs.readFileSync(envPath, 'utf8'));
    } else {
      console.log('\nNo previous .env file found. Creating new file.');
    }

    // Write new content
    fs.writeFileSync(envPath, envContent);
    console.log('\nNew .env content written:');
    console.log(envContent);

    // Verify file was written
    if (fs.existsSync(envPath)) {
      const writtenContent = fs.readFileSync(envPath, 'utf8');
      if (writtenContent === envContent) {
        console.log('\n✅ Environment file successfully updated and verified.');
      } else {
        console.log('\n⚠️ Warning: Written content does not match expected content!');
        console.log('Expected:', envContent);
        console.log('Actual:', writtenContent);
      }
    } else {
      throw new Error('Failed to create .env file');
    }

  } catch (error) {
    console.error('\n❌ Error updating .env file:', error);
    throw error; // Re-throw to handle in the main function
  }
}

async function configureIPFS() {
  try {
    // Create IPFS client with the correct API URL
    const ipfs = create({ url: 'http://127.0.0.1:5001/api/v0' });

    // Configure CORS for IPFS
    await configureIPFSCors();

    // Test IPFS connection
    const id = await ipfs.id();
    console.log('\n✅ IPFS client connected successfully. Node ID:', id.id);

    return ipfs;
  } catch (error) {
    console.error('\n❌ Error configuring IPFS:', error);
    throw error;
  }
}

async function main() {
  try {
    // Configure IPFS CORS first
    await configureIPFSCors();

    // 1. Compile contracts
    console.log('Compiling contracts...');
    execSync('npx hardhat compile', { stdio: 'inherit' });

    // 2. Deploy contracts
    console.log('\nDeploying contracts...');
    const MockZKPVerifier = await ethers.getContractFactory("MockZKPVerifier");
    const mockVerifier = await MockZKPVerifier.deploy() as unknown as MockZKPVerifier;
    await mockVerifier.waitForDeployment();

    const VoterRegistration = await ethers.getContractFactory("VoterRegistration");
    const voterRegistration = await VoterRegistration.deploy(await mockVerifier.getAddress()) as unknown as VoterRegistration;
    await voterRegistration.waitForDeployment();

    const VotingContract = await ethers.getContractFactory("VotingContract");
    const votingContract = await VotingContract.deploy() as unknown as VotingContract;
    await votingContract.waitForDeployment();

    const ElectionManager = await ethers.getContractFactory("ElectionManager");
    const electionManager = await ElectionManager.deploy(
      await votingContract.getAddress(),
      await voterRegistration.getAddress(),
      await mockVerifier.getAddress()
    ) as unknown as ElectionManager;
    await electionManager.waitForDeployment();

    // Transfer ownership and initialize
    await votingContract.transferOwnership(await electionManager.getAddress());
    await electionManager.initialize(
      await votingContract.getAddress(),
      await voterRegistration.getAddress()
    );
    await mockVerifier.setMockVerification(true);

    // Store contract addresses
    const contracts = {
      electionManager: await electionManager.getAddress(),
      votingContract: await votingContract.getAddress(),
      voterRegistration: await voterRegistration.getAddress(),
      mockVerifier: await mockVerifier.getAddress()
    };

    // 3. Update .env file
    await updateEnvFile(contracts);

    // 4. Register test voters
    console.log('\nRegistering test voters...');
    const [admin, voter1, voter2, voter3] = await ethers.getSigners();
    const regions = ["KYIV", "LVIV", "KHARKIV", "ODESA", "DNIPRO"];
    
    // Mock ZKP proof parameters
    const zkProofParams: ZKProofParams = {
      a: [1, 2],
      b: [[3, 4], [5, 6]],
      c: [7, 8],
      input: [9, 10]
    };

    // Register voters with different regions
    await voterRegistration.connect(voter1).registerVoter(
      regions[0],
      zkProofParams.a,
      zkProofParams.b,
      zkProofParams.c,
      zkProofParams.input
    );

    await voterRegistration.connect(voter2).registerVoter(
      regions[1],
      zkProofParams.a,
      zkProofParams.b,
      zkProofParams.c,
      zkProofParams.input
    );

    await voterRegistration.connect(voter3).registerVoter(
      regions[2],
      zkProofParams.a,
      zkProofParams.b,
      zkProofParams.c,
      zkProofParams.input
    );

    // 5. Create test elections
    console.log('\nCreating test elections...');
    // Create elections sequentially to avoid timing issues
    await createTestElection(electionManager, "Presidential Election 2024", "National presidential election", regions);
    await createTestElection(electionManager, "Local Council - Kyiv", "Kyiv city council election", ["KYIV"]);
    await createTestElection(electionManager, "Regional Development", "Vote for regional development projects", regions);
    await createTestElection(electionManager, "Education Reform", "Vote on proposed education reforms", regions);
    await createTestElection(electionManager, "Environmental Initiative", "Green city development program", regions);

    console.log('\nSetup completed successfully!');
    console.log('\nTo start the frontend, run:');
    console.log('cd zkholos-frontend && npm run dev');

  } catch (error) {
    console.error('Error during setup:', error);
    process.exit(1);
  }
}

main(); 