import { ethers } from 'ethers';

// Contract ABIs
export const ELECTION_MANAGER_ABI = [
  'function createElection(string memory title, string memory description, uint256 startTime, uint256 endTime, string[] memory regions, tuple(uint256 id, string name, string description, uint256 voteCount, bool isActive)[] memory candidates, string memory ipfsHash) public returns (uint256)',
  'function castVote(uint256 electionId, uint256 candidateId, uint256[2] memory a, uint256[2][2] memory b, uint256[2] memory c, uint256[2] memory input) public',
  'function updateEligibleVoters(uint256 electionId) public',
  'function startElectionPhase(uint256 electionId) public',
  'function getElectionState(uint256 electionId) public view returns (uint256 id, uint8 phase, uint256 startTime, uint256 endTime, uint256 totalEligibleVoters, bool isPaused)'
];

export const VOTING_CONTRACT_ABI = [
  'function elections(uint256) public view returns (uint256 id, string memory title, string memory description, uint256 startTime, uint256 endTime, bool isActive, bool isCompleted, uint256 totalVotes, uint256 totalEligibleVoters, string[] memory regions, string memory ipfsHash)',
  'function electionRegions(uint256) public view returns (string[] memory)',
  'function candidates(uint256, uint256) public view returns (uint256 id, string memory name, string memory description, uint256 voteCount, bool isActive)',
  'function getElectionsLength() public view returns (uint256)',
  'function getElection(uint256 _electionId) public view returns (uint256 id, string memory title, string memory description, uint256 startTime, uint256 endTime, bool isActive, bool isCompleted, uint256 totalVotes, uint256 totalEligibleVoters, string[] memory regions, string memory ipfsHash)',
  'function startElection(uint256 _electionId) external',
  'function castVote(uint256 _electionId, uint256 _candidateId, string memory _region) public',
  'function castVoteWithProof(uint256 _electionId, uint256 _candidateId, uint256[2] memory a, uint256[2][2] memory b, uint256[2] memory c, uint256[2] memory input, bytes32 commitment, string memory _region, address _voter) external',
  'event ElectionCreated(uint256 indexed electionId, string title, uint256 startTime, uint256 endTime)',
  'event ElectionStarted(uint256 indexed electionId)',
  'event VoteCast(uint256 indexed electionId, uint256 indexed candidateId, string region)',
  'event ElectionCompleted(uint256 indexed electionId)'
];

export const VOTER_REGISTRATION_ABI = [
  'function registerVoter(string memory region, uint256[2] memory a, uint256[2][2] memory b, uint256[2] memory c, uint256[2] memory input) public',
  'function isRegistered(address voter) public view returns (bool)'
];

// Default contract addresses (can be overridden by environment variables)
const defaultAddresses = {
  electionManager: '0xcf7ed3acca5a467e9e704c703e8d87f634fb0fc9',
  votingContract: '0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0',
  voterRegistration: '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512',
  mockZkpVerifier: '0x5fbdb2315678afecb367f032d93f642f64180aa3'
};

// Get contract addresses from environment variables or use defaults
export const getContractAddresses = () => {
  const addresses = {
    electionManager: import.meta.env.VITE_ELECTION_MANAGER_ADDRESS || defaultAddresses.electionManager,
    votingContract: import.meta.env.VITE_VOTING_CONTRACT_ADDRESS || defaultAddresses.votingContract,
    voterRegistration: import.meta.env.VITE_VOTER_REGISTRATION_ADDRESS || defaultAddresses.voterRegistration,
    mockZkpVerifier: import.meta.env.VITE_MOCK_ZKP_VERIFIER_ADDRESS || defaultAddresses.mockZkpVerifier
  };
  
  console.log('Using contract addresses:', addresses);
  return addresses;
};

// Get contract instances
export const getContracts = (provider: ethers.providers.Provider) => {
  const addresses = getContractAddresses();
  
  const contracts = {
    electionManager: new ethers.Contract(
      addresses.electionManager,
      ELECTION_MANAGER_ABI,
      provider
    ),
    votingContract: new ethers.Contract(
      addresses.votingContract,
      VOTING_CONTRACT_ABI,
      provider
    ),
    voterRegistration: new ethers.Contract(
      addresses.voterRegistration,
      VOTER_REGISTRATION_ABI,
      provider
    ),
    mockZkpVerifier: new ethers.Contract(
      addresses.mockZkpVerifier,
      ['function setMockVerification(bool) public'],
      provider
    )
  };

  console.log('Initialized contracts:', {
    electionManager: contracts.electionManager.address,
    votingContract: contracts.votingContract.address,
    voterRegistration: contracts.voterRegistration.address,
    mockZkpVerifier: contracts.mockZkpVerifier.address
  });

  return contracts;
}; 