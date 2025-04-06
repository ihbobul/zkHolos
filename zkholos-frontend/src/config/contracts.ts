import { ethers, Provider } from 'ethers';

// Contract addresses from environment variables
export const VOTING_CONTRACT_ADDRESS = import.meta.env.VITE_VOTING_CONTRACT_ADDRESS;
export const ELECTION_MANAGER_ADDRESS = import.meta.env.VITE_ELECTION_MANAGER_ADDRESS;
export const VOTER_REGISTRATION_ADDRESS = import.meta.env.VITE_VOTER_REGISTRATION_ADDRESS;
export const MOCK_ZKP_VERIFIER_ADDRESS = import.meta.env.VITE_MOCK_ZKP_VERIFIER_ADDRESS;

// Contract ABIs
export const ELECTION_MANAGER_ABI = [
  // Election Management
  'function createElection(string memory title, string memory description, uint256 startTime, uint256 endTime, string[] memory regions, tuple(uint256 id, string name, string description, uint256 voteCount, bool isActive)[] memory candidates, string memory ipfsHash) public returns (uint256)',
  'function startElectionPhase(uint256 electionId) public',
  'function pauseElection(uint256 electionId) public',
  'function resumeElection(uint256 electionId) public',
  'function completeElection(uint256 electionId) public',
  
  // Candidate Management
  'function addCandidate(uint256 _electionId, string memory _name, string memory _description) public',
  'function updateCandidateStatus(uint256 electionId, uint256 candidateId, bool isActive) public',
  
  // Voting
  'function castVote(uint256 electionId, uint256 candidateId, string memory region) public',
  'function castVoteWithProof(uint256 electionId, uint256 candidateId, uint256[2] memory a, uint256[2][2] memory b, uint256[2] memory c, uint256[2] memory input) public',
  'function hasVoted(uint256 electionId, address voter) public view returns (bool)',
  
  // View Functions
  'function getElectionState(uint256 electionId) public view returns (uint256 id, uint8 phase, uint256 startTime, uint256 endTime, uint256 totalEligibleVoters, bool isPaused)',
  'function updateEligibleVoters(uint256 electionId) public',
  
  // Events
  'event ElectionCreated(uint256 indexed electionId, string title, uint256 startTime, uint256 endTime)',
  'event ElectionStarted(uint256 indexed electionId)',
  'event ElectionPaused(uint256 indexed electionId)',
  'event ElectionResumed(uint256 indexed electionId)',
  'event ElectionCompleted(uint256 indexed electionId)',
  'event CandidateAdded(uint256 indexed electionId, uint256 indexed candidateId)',
  'event CandidateStatusUpdated(uint256 indexed electionId, uint256 indexed candidateId, bool isActive)',
  'event VoteCast(uint256 indexed electionId, uint256 indexed candidateId, string region)'
];

export const VOTING_CONTRACT_ABI = [
  // View Functions
  'function getElectionsLength() public view returns (uint256)',
  'function getElection(uint256 _electionId) public view returns (uint256 id, string memory title, string memory description, uint256 startTime, uint256 endTime, bool isActive, bool isCompleted, uint256 totalVotes, uint256 totalEligibleVoters, string[] memory regions, string memory ipfsHash)',
  'function candidates(uint256 electionId, uint256 candidateId) public view returns (uint256 id, string memory name, string memory description, uint256 voteCount, bool isActive)',
  'function getRegionVoteCount(uint256 electionId, string memory region) public view returns (uint256)',
  'function hasVoted(uint256 electionId, address voter) public view returns (bool)',
  
  // Events
  'event ElectionCreated(uint256 indexed electionId, string title, uint256 startTime, uint256 endTime)',
  'event VoteCast(uint256 indexed electionId, uint256 indexed candidateId, string region)',
  'event ElectionCompleted(uint256 indexed electionId)'
];

export const VOTER_REGISTRATION_ABI = [
  'function registerVoter(string memory region, uint256[2] memory a, uint256[2][2] memory b, uint256[2] memory c, uint256[2] memory input) public',
  'function isRegistered(address voter) public view returns (bool)',
  'function getVoterInfo(address voter) public view returns (string memory region, bool isRegistered, bool isEligible, uint256 registrationTime)',
  'function updateEligibility(address voter, bool isEligible, uint256[2] memory a, uint256[2][2] memory b, uint256[2] memory c, uint256[2] memory input) public',
  'function getRegionVoterCount(string memory region) public view returns (uint256)',
  'function getRegisteredVoters() public view returns (address[] memory)'
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
export const getContracts = (provider: Provider) => {
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