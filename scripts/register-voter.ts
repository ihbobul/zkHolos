import { ethers } from "hardhat";

async function main() {
  try {
    // Get the signer (your current account)
    const provider = new ethers.JsonRpcProvider('http://localhost:8545');
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    
    console.log("Registering voter with address:", address);

    // Get the VoterRegistration contract
    const VOTER_REGISTRATION_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
    const VOTER_REGISTRATION_ABI = [
      'function registerVoter(string memory region, uint256[2] memory a, uint256[2][2] memory b, uint256[2] memory c, uint256[2] memory input) public',
      'function isRegistered(address voter) public view returns (bool)',
      'function getVoterInfo(address voter) public view returns (string memory region, bool isRegistered, bool isEligible, uint256 registrationTime)'
    ];

    const voterRegistration = new ethers.Contract(
      VOTER_REGISTRATION_ADDRESS,
      VOTER_REGISTRATION_ABI,
      signer
    );

    // Check if already registered
    const isRegistered = await voterRegistration.isRegistered(address);
    if (isRegistered) {
      console.log("You are already registered as a voter!");
      const voterInfo = await voterRegistration.getVoterInfo(address);
      console.log("Your voter info:", {
        region: voterInfo[0],
        isRegistered: voterInfo[1],
        isEligible: voterInfo[2],
        registrationTime: new Date(Number(voterInfo[3]) * 1000).toLocaleString()
      });
      return;
    }

    // Mock ZKP proof parameters (these work with the mock verifier)
    const mockProof = {
      a: [1, 2],
      b: [[3, 4], [5, 6]],
      c: [7, 8],
      input: [9, 10]
    };

    // Register as a voter in KYIV region
    console.log("Registering as a voter in KYIV region...");
    const tx = await voterRegistration.registerVoter(
      "KYIV",
      mockProof.a,
      mockProof.b,
      mockProof.c,
      mockProof.input,
      { gasLimit: 500000 }
    );

    console.log("Waiting for transaction confirmation...");
    await tx.wait();
    console.log("Successfully registered as a voter!");

    // Get and display voter info
    const voterInfo = await voterRegistration.getVoterInfo(address);
    console.log("Your voter info:", {
      region: voterInfo[0],
      isRegistered: voterInfo[1],
      isEligible: voterInfo[2],
      registrationTime: new Date(Number(voterInfo[3]) * 1000).toLocaleString()
    });

  } catch (error) {
    console.error("Error registering voter:", error);
    process.exit(1);
  }
}

main(); 