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
    mapping(uint256 => Election) public elections;
    mapping(uint256 => mapping(uint256 => Candidate)) public candidates;
    mapping(uint256 => uint256) public candidateCountPerElection;
    mapping(uint256 => string[]) public electionRegions;
    mapping(uint256 => mapping(address => bool)) public hasVoted; // Track votes by election and voter

    ZKPVerifier public zkpVerifier;
    mapping(uint256 => mapping(bytes32 => bool)) public usedCommitments;

    event ElectionCreated(uint256 indexed electionId, string title, uint256 startTime, uint256 endTime);
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
        string[] memory _regions
    ) external onlyOwner whenNotPaused returns (uint256) {
        require(_endTime > _startTime, "End time must be after start time");
        require(_regions.length > 0, "At least one region must be specified");

        electionCount++;
        Election storage election = elections[electionCount];
        election.id = electionCount;
        election.title = _title;
        election.description = _description;
        election.startTime = _startTime;
        election.endTime = _endTime;
        election.isActive = false;
        election.isCompleted = false;
        election.totalVotes = 0;
        election.totalEligibleVoters = 0;

        // Store regions
        for (uint256 i = 0; i < _regions.length; i++) {
            electionRegions[electionCount].push(_regions[i]);
            election.regionVoteCounts[_regions[i]] = 0; // Initialize region vote count
        }

        emit ElectionCreated(electionCount, _title, _startTime, _endTime);
        return electionCount;
    }

    function addCandidate(
        uint256 _electionId,
        string memory _name,
        string memory _description
    ) external onlyOwner whenNotPaused returns (uint256) {
        require(_electionId <= electionCount, "Election does not exist");
        Election storage election = elections[_electionId];
        require(!election.isCompleted, "Election is completed");

        candidateCount++;
        uint256 candidateId = candidateCount;
        candidates[_electionId][candidateId] = Candidate({
            id: candidateId,
            name: _name,
            description: _description,
            voteCount: 0,
            isActive: true
        });
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
        require(_candidateId <= candidateCountPerElection[_electionId], "Invalid candidate");
        
        Candidate storage candidate = candidates[_electionId][_candidateId];
        candidate.isActive = _isActive;
        
        emit CandidateStatusUpdated(_electionId, _candidateId, _isActive);
    }

    function startElection(uint256 _electionId) external onlyOwner whenNotPaused {
        Election storage election = elections[_electionId];
        require(!election.isCompleted, "Election is completed");
        require(block.timestamp >= election.startTime, "Election has not started yet");
        election.isActive = true;
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
        
        bool alreadyVoted = hasVoted[_electionId][msg.sender];
        emit DebugVoteCast(_electionId, msg.sender, _candidateId, _region, alreadyVoted);
        
        require(!alreadyVoted, "Already voted in this election");

        // Update vote counts
        elections[_electionId].totalVotes++;
        candidates[_electionId][_candidateId].voteCount++;
        elections[_electionId].regionVoteCounts[_region] = elections[_electionId].regionVoteCounts[_region] + 1;
        
        // Mark voter as having voted
        hasVoted[_electionId][msg.sender] = true;

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
        Election storage election = elections[_electionId];
        require(election.isActive, "Election is not active");
        require(!election.isCompleted, "Election is completed");
        require(_candidateId <= candidateCountPerElection[_electionId], "Invalid candidate");
        
        bool alreadyVoted = hasVoted[_electionId][_voter];
        bool hasUsedCommitment = usedCommitments[_electionId][commitment];
        
        require(!alreadyVoted, "Already voted in this election");
        require(!hasUsedCommitment, "Commitment already used");
        require(address(zkpVerifier) != address(0), "ZKP verifier not set");
        
        Candidate storage candidate = candidates[_electionId][_candidateId];
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
        hasVoted[_electionId][_voter] = true;

        emit DebugVoteWithProof(_electionId, _voter, _candidateId, _region, alreadyVoted, hasUsedCommitment);
        emit VoteCastWithProof(_electionId, _candidateId, commitment);
    }

    function completeElection(uint256 _electionId) external onlyOwner whenNotPaused {
        Election storage election = elections[_electionId];
        require(election.isActive, "Election is not active");
        require(!election.isCompleted, "Election is already completed");
        require(block.timestamp >= election.endTime, "Election has not ended yet");

        election.isActive = false;
        election.isCompleted = true;

        emit ElectionCompleted(_electionId);
    }

    function pauseElection(uint256 _electionId) external onlyOwner {
        Election storage election = elections[_electionId];
        require(election.isActive, "Election is not active");
        require(!election.isCompleted, "Election is completed");
        
        election.isActive = false;
        _pause();
        emit ElectionPaused(_electionId);
    }

    function resumeElection(uint256 _electionId) external onlyOwner {
        Election storage election = elections[_electionId];
        require(!election.isCompleted, "Election is completed");
        require(block.timestamp < election.endTime, "Election has ended");
        require(!election.isActive, "Election is already active");
        
        election.isActive = true;
        _unpause();
        emit ElectionResumed(_electionId);
    }

    function getElection(uint256 _electionId) external view returns (
        uint256 id,
        string memory title,
        string memory description,
        uint256 startTime,
        uint256 endTime,
        bool isActive,
        bool isCompleted,
        uint256 totalVotes,
        uint256 totalEligibleVoters,
        string[] memory regions
    ) {
        Election storage election = elections[_electionId];
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
            electionRegions[_electionId]
        );
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
        return elections[_electionId].regionVoteCounts[_region];
    }

    function getElectionResults(uint256 _electionId) public view returns (
        uint256 totalVoteCount,
        uint256[] memory candidateVoteCounts
    ) {
        totalVoteCount = elections[_electionId].totalVotes;
        
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
} 