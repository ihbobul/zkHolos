// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./ZKPVerifier.sol";

contract VotingContract is Ownable, ReentrancyGuard, Pausable {
    struct Election {
        uint256 id;
        string title;
        string description;
        uint256 startTime;
        uint256 endTime;
        bool isActive;
        bool isCompleted;
        uint256 totalVotes;
        uint256 totalEligibleVoters;
        string[] regions;
        Candidate[] candidates;
        mapping(address => bool) hasVoted;
        string ipfsHash;
        mapping(string => uint256) regionVoteCounts; // region => vote count
    }

    struct Candidate {
        uint256 id;
        string name;
        string description;
        uint256 voteCount;
        bool isActive;
    }

    uint256 private electionCount;
    uint256 private candidateCount;
    Election[] public elections;
    mapping(uint256 => mapping(uint256 => Candidate)) public candidates;
    mapping(uint256 => uint256) public candidateCountPerElection;
    mapping(uint256 => string[]) public electionRegions;
    mapping(uint256 => mapping(bytes32 => bool)) public usedCommitments;

    ZKPVerifier public zkpVerifier;

    // Add public getter for elections array length
    function getElectionsLength() public view returns (uint256) {
        return elections.length;
    }

    // Add helper function to get election by ID
    function getElection(uint256 _electionId) public view returns (
        uint256 id,
        string memory title,
        string memory description,
        uint256 startTime,
        uint256 endTime,
        bool isActive,
        bool isCompleted,
        uint256 totalVotes,
        uint256 totalEligibleVoters,
        string[] memory regions,
        string memory ipfsHash
    ) {
        require(_electionId > 0 && _electionId <= electionCount, "Invalid election ID");
        Election storage election = elections[_electionId - 1];
        return (
            election.id,
            election.title,
            election.description,
            election.startTime,
            election.endTime,
            election.isActive,
            election.isCompleted,
            election.totalVotes,
            election.totalEligibleVoters,
            election.regions,
            election.ipfsHash
        );
    }

    event ElectionCreated(uint256 indexed electionId, string title, uint256 startTime, uint256 endTime);
    event ElectionStarted(uint256 indexed electionId);
    event CandidateAdded(uint256 indexed electionId, uint256 indexed candidateId, string name);
    event VoteCast(uint256 indexed electionId, uint256 indexed candidateId, string region);
    event ElectionCompleted(uint256 indexed electionId);
    event ElectionPaused(uint256 indexed electionId);
    event ElectionResumed(uint256 indexed electionId);
    event CandidateStatusUpdated(uint256 indexed electionId, uint256 indexed candidateId, bool isActive);
    event ZKPVerifierUpdated(address indexed oldVerifier, address indexed newVerifier);
    event VoteCastWithProof(uint256 indexed electionId, uint256 indexed candidateId, bytes32 commitment);
    event DebugVoteCast(uint256 indexed electionId, address indexed voter, uint256 candidateId, string region, bool hasVoted);
    event DebugVoteWithProof(uint256 indexed electionId, address indexed voter, uint256 candidateId, string region, bool hasVoted, bool hasUsedCommitment);

    constructor() {
        _transferOwnership(msg.sender);
    }

    function createElection(
        string memory _title,
        string memory _description,
        uint256 _startTime,
        uint256 _endTime,
        string[] memory _regions,
        Candidate[] memory _candidates,
        string memory _ipfsHash
    ) external onlyOwner whenNotPaused returns (uint256) {
        require(_startTime > block.timestamp + 1 minutes, "Start time must be at least 1 minute in the future");
        require(_endTime > _startTime + 1 hours, "End time must be at least 1 hour after start time");
        require(_regions.length > 0, "Must have at least one region");
        require(_candidates.length > 0, "Must have at least one candidate");

        uint256 newElectionId = electionCount + 1;
        elections.push();
        Election storage election = elections[newElectionId - 1];
        election.id = newElectionId;
        election.title = _title;
        election.description = _description;
        election.startTime = _startTime;
        election.endTime = _endTime;
        election.isActive = false;
        election.isCompleted = false;
        election.totalVotes = 0;
        election.totalEligibleVoters = 0;
        election.regions = _regions;
        election.ipfsHash = _ipfsHash;

        for (uint256 i = 0; i < _candidates.length; i++) {
            election.candidates.push(_candidates[i]);
        }

        // Store regions
        for (uint256 i = 0; i < _regions.length; i++) {
            electionRegions[newElectionId].push(_regions[i]);
            election.regionVoteCounts[_regions[i]] = 0; // Initialize region vote count
        }

        electionCount = newElectionId;
        emit ElectionCreated(newElectionId, _title, _startTime, _endTime);
        return newElectionId;
    }

    function addCandidate(
        uint256 _electionId,
        string memory _name,
        string memory _description
    ) external onlyOwner whenNotPaused returns (uint256) {
        require(_electionId > 0 && _electionId <= electionCount, "Election does not exist");
        Election storage election = elections[_electionId - 1];
        require(!election.isCompleted, "Election is completed");

        candidateCount++;
        uint256 candidateId = candidateCount;
        
        // Create new candidate
        Candidate memory newCandidate = Candidate({
            id: candidateId,
            name: _name,
            description: _description,
            voteCount: 0,
            isActive: true
        });

        // Add to both storage locations
        election.candidates.push(newCandidate);
        candidates[_electionId][candidateId] = newCandidate;
        candidateCountPerElection[_electionId]++;

        emit CandidateAdded(_electionId, candidateId, _name);
        return candidateId;
    }

    function updateCandidateStatus(
        uint256 _electionId,
        uint256 _candidateId,
        bool _isActive
    ) external onlyOwner whenNotPaused {
        require(_electionId <= electionCount, "Election does not exist");
        Election storage election = elections[_electionId - 1];
        require(_candidateId > 0 && _candidateId <= election.candidates.length, "Invalid candidate");
        
        // Update candidate status in the election's candidates array
        election.candidates[_candidateId - 1].isActive = _isActive;
        
        emit CandidateStatusUpdated(_electionId, _candidateId, _isActive);
    }

    function startElection(uint256 _electionId) external onlyOwner whenNotPaused {
        require(_electionId > 0 && _electionId <= electionCount, "Invalid election ID");
        Election storage election = elections[_electionId - 1];
        require(!election.isCompleted, "Election is completed");
        require(block.timestamp >= election.startTime - 1 minutes, "Election start time not reached");
        election.isActive = true;
        emit ElectionStarted(_electionId);
    }

    function setZKPVerifier(address _zkpVerifier) external onlyOwner {
        require(_zkpVerifier != address(0), "Invalid ZKP verifier address");
        address oldVerifier = address(zkpVerifier);
        zkpVerifier = ZKPVerifier(_zkpVerifier);
        emit ZKPVerifierUpdated(oldVerifier, _zkpVerifier);
    }

    function castVote(uint256 _electionId, uint256 _candidateId, string memory _region) public {
        require(_electionId > 0, "Invalid election ID");
        require(_candidateId > 0, "Invalid candidate ID");
        require(bytes(_region).length > 0, "Invalid region");
        
        bool alreadyVoted = elections[_electionId].hasVoted[msg.sender];
        emit DebugVoteCast(_electionId, msg.sender, _candidateId, _region, alreadyVoted);
        
        require(!alreadyVoted, "Already voted in this election");

        // Update vote counts
        elections[_electionId].totalVotes++;
        candidates[_electionId][_candidateId].voteCount++;
        elections[_electionId].regionVoteCounts[_region] = elections[_electionId].regionVoteCounts[_region] + 1;
        
        // Mark voter as having voted
        elections[_electionId].hasVoted[msg.sender] = true;

        emit VoteCast(_electionId, _candidateId, _region);
    }

    function castVoteWithProof(
        uint256 _electionId,
        uint256 _candidateId,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[2] memory input,
        bytes32 commitment,
        string memory _region,
        address _voter
    ) external nonReentrant whenNotPaused {
        require(_electionId > 0 && _electionId <= electionCount, "Invalid election ID");
        Election storage election = elections[_electionId - 1];
        require(election.isActive, "Election is not active");
        require(!election.isCompleted, "Election is completed");
        require(_candidateId > 0 && _candidateId <= election.candidates.length, "Invalid candidate");
        
        bool alreadyVoted = election.hasVoted[_voter];
        bool hasUsedCommitment = usedCommitments[_electionId][commitment];
        
        require(!alreadyVoted, "Already voted in this election");
        require(!hasUsedCommitment, "Commitment already used");
        require(address(zkpVerifier) != address(0), "ZKP verifier not set");
        
        Candidate storage candidate = election.candidates[_candidateId - 1];
        require(candidate.isActive, "Candidate is not active");

        // Verify the ZKP proof
        require(
            zkpVerifier.verifyProof(a, b, c, input, _electionId, commitment),
            "Invalid ZKP proof"
        );

        // Update election state
        election.totalVotes++;
        candidate.voteCount++;
        election.regionVoteCounts[_region] = election.regionVoteCounts[_region] + 1;
        usedCommitments[_electionId][commitment] = true;
        election.hasVoted[_voter] = true;

        emit DebugVoteWithProof(_electionId, _voter, _candidateId, _region, alreadyVoted, hasUsedCommitment);
        emit VoteCastWithProof(_electionId, _candidateId, commitment);
    }

    function completeElection(uint256 _electionId) external onlyOwner whenNotPaused {
        require(_electionId > 0 && _electionId <= electionCount, "Invalid election ID");
        Election storage election = elections[_electionId - 1];
        require(election.isActive, "Election is not active");
        require(!election.isCompleted, "Election is already completed");
        require(block.timestamp >= election.endTime, "Election has not ended yet");

        election.isActive = false;
        election.isCompleted = true;

        emit ElectionCompleted(_electionId);
    }

    function pauseElection(uint256 _electionId) external onlyOwner {
        require(_electionId > 0 && _electionId <= electionCount, "Invalid election ID");
        Election storage election = elections[_electionId - 1];
        require(election.isActive, "Election is not active");
        require(!election.isCompleted, "Election is completed");
        
        election.isActive = false;
        _pause();
        emit ElectionPaused(_electionId);
    }

    function resumeElection(uint256 _electionId) external onlyOwner {
        require(_electionId > 0 && _electionId <= electionCount, "Invalid election ID");
        Election storage election = elections[_electionId - 1];
        require(!election.isCompleted, "Election is completed");
        require(block.timestamp < election.endTime, "Election has ended");
        require(!election.isActive, "Election is already active");
        
        election.isActive = true;
        _unpause();
        emit ElectionResumed(_electionId);
    }

    function getCandidate(uint256 _electionId, uint256 _candidateId) external view returns (
        uint256 id,
        string memory name,
        string memory description,
        uint256 voteCount,
        bool isActive
    ) {
        Candidate storage candidate = candidates[_electionId][_candidateId];
        return (
            candidate.id,
            candidate.name,
            candidate.description,
            candidate.voteCount,
            candidate.isActive
        );
    }

    function getCandidateCount(uint256 _electionId) external view returns (uint256) {
        return candidateCountPerElection[_electionId];
    }

    function getRegionVoteCount(uint256 _electionId, string memory _region) external view returns (uint256) {
        require(_electionId > 0 && _electionId <= electionCount, "Invalid election ID");
        Election storage election = elections[_electionId - 1];
        return election.regionVoteCounts[_region];
    }

    function getElectionResults(uint256 _electionId) public view returns (
        uint256 totalVoteCount,
        uint256[] memory candidateVoteCounts
    ) {
        require(_electionId > 0 && _electionId <= electionCount, "Invalid election ID");
        Election storage election = elections[_electionId - 1];
        totalVoteCount = election.totalVotes;
        
        // Get the number of candidates (assuming sequential IDs starting from 1)
        uint256 maxCandidateId = candidateCountPerElection[_electionId];
        candidateVoteCounts = new uint256[](maxCandidateId);
        
        for (uint256 i = 1; i <= maxCandidateId; i++) {
            candidateVoteCounts[i-1] = candidates[_electionId][i].voteCount;
        }
        
        return (totalVoteCount, candidateVoteCounts);
    }

    function getRegionResults(uint256 _electionId, string memory _region) public view returns (
        uint256[] memory candidateVoteCounts
    ) {
        uint256 maxCandidateId = candidateCountPerElection[_electionId];
        candidateVoteCounts = new uint256[](maxCandidateId);
        
        for (uint256 i = 1; i <= maxCandidateId; i++) {
            candidateVoteCounts[i-1] = elections[_electionId].regionVoteCounts[_region];
        }
        
        return candidateVoteCounts;
    }

    function hasVoted(uint256 _electionId, address _voter) public view returns (bool) {
        require(_electionId > 0 && _electionId <= electionCount, "Invalid election ID");
        Election storage election = elections[_electionId - 1];
        return election.hasVoted[_voter];
    }
} 