import { ethers } from 'ethers';
import { getContracts } from '../config/contracts';

// Check if MetaMask is installed
export const isMetaMaskInstalled = (): boolean => {
  return typeof window.ethereum !== 'undefined';
};

// Verify contract code exists at address
async function verifyContractCode(provider: ethers.providers.Provider, address: string): Promise<boolean> {
  console.log(`Verifying contract at address: ${address}`);
  const code = await provider.getCode(address);
  const exists = code !== '0x';
  console.log(`Contract at ${address} exists: ${exists}, code length: ${code.length}`);
  return exists;
}

// Get the current provider
export const getProvider = (): ethers.providers.Web3Provider | null => {
  if (!isMetaMaskInstalled()) {
    return null;
  }
  return new ethers.providers.Web3Provider(window.ethereum);
};

// Get the current signer
export const getSigner = async (): Promise<ethers.Signer | null> => {
  const provider = getProvider();
  if (!provider) {
    return null;
  }
  
  try {
    await provider.send("eth_requestAccounts", []);
    return provider.getSigner();
  } catch (error) {
    console.error("Error getting signer:", error);
    return null;
  }
};

// Get contract instances with the current provider
export const getContractInstances = async () => {
  const provider = getProvider();
  if (!provider) {
    throw new Error("Web3 provider not available");
  }

  const addresses = getContracts(provider);
  console.log('Contract addresses:', {
    electionManager: addresses.electionManager.address,
    votingContract: addresses.votingContract.address,
    voterRegistration: addresses.voterRegistration.address,
    mockZkpVerifier: addresses.mockZkpVerifier.address
  });
  
  // Verify contract code exists
  const verifications = await Promise.all([
    verifyContractCode(provider, addresses.electionManager.address),
    verifyContractCode(provider, addresses.votingContract.address),
    verifyContractCode(provider, addresses.voterRegistration.address),
    verifyContractCode(provider, addresses.mockZkpVerifier.address)
  ]);

  if (!verifications.every(Boolean)) {
    const failedContracts = [
      { name: 'electionManager', verified: verifications[0] },
      { name: 'votingContract', verified: verifications[1] },
      { name: 'voterRegistration', verified: verifications[2] },
      { name: 'mockZkpVerifier', verified: verifications[3] }
    ].filter(c => !c.verified).map(c => c.name);
    
    console.error("Contract verification failed. Failed contracts:", failedContracts);
    throw new Error(`Contracts not deployed at specified addresses: ${failedContracts.join(', ')}`);
  }

  return addresses;
};

// Get contract instances with the current signer
export const getSignedContractInstances = async () => {
  const provider = getProvider();
  if (!provider) {
    throw new Error("Web3 provider not available");
  }
  
  const signer = await getSigner();
  if (!signer) {
    throw new Error("Web3 signer not available");
  }
  
  // Create contracts with the provider and connect them to the signer
  const contracts = getContracts(provider);
  return {
    electionManager: contracts.electionManager.connect(signer),
    votingContract: contracts.votingContract.connect(signer),
    voterRegistration: contracts.voterRegistration.connect(signer),
    mockZkpVerifier: contracts.mockZkpVerifier.connect(signer)
  };
};

// Get the current account address
export const getCurrentAccount = async (): Promise<string | null> => {
  const signer = await getSigner();
  if (!signer) {
    return null;
  }
  return await signer.getAddress();
}; 