// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

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
        mapping(address => bool) hasVoted;
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

    event ElectionCreated(uint256 indexed electionId, string title, uint256 startTime, uint256 endTime);
    event CandidateAdded(uint256 indexed electionId, uint256 indexed candidateId, string name);
    event VoteCast(uint256 indexed electionId, uint256 indexed candidateId, address voter, string region);
    event ElectionCompleted(uint256 indexed electionId);
    event ElectionPaused(uint256 indexed electionId);
    event ElectionResumed(uint256 indexed electionId);
    event CandidateStatusUpdated(uint256 indexed electionId, uint256 indexed candidateId, bool isActive);

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

    function castVote(
        uint256 _electionId,
        uint256 _candidateId,
        string memory _region
    ) external nonReentrant whenNotPaused {
        Election storage election = elections[_electionId];
        require(election.isActive, "Election is not active");
        require(!election.isCompleted, "Election is completed");
        require(!election.hasVoted[msg.sender], "Already voted");
        require(_candidateId <= candidateCountPerElection[_electionId], "Invalid candidate");
        
        Candidate storage candidate = candidates[_electionId][_candidateId];
        require(candidate.isActive, "Candidate is not active");

        // Verify region is valid for this election
        bool regionValid = false;
        for (uint256 i = 0; i < electionRegions[_electionId].length; i++) {
            if (keccak256(bytes(electionRegions[_electionId][i])) == keccak256(bytes(_region))) {
                regionValid = true;
                break;
            }
        }
        require(regionValid, "Invalid region for this election");

        election.hasVoted[msg.sender] = true;
        election.totalVotes++;
        election.regionVoteCounts[_region]++;
        candidates[_electionId][_candidateId].voteCount++;

        emit VoteCast(_electionId, _candidateId, msg.sender, _region);
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

    function getElectionResults(uint256 _electionId) external view returns (Candidate[] memory) {
        require(_electionId <= electionCount, "Invalid election ID");
        uint256 count = candidateCountPerElection[_electionId];
        Candidate[] memory results = new Candidate[](count);
        for (uint256 i = 0; i < count; i++) {
            results[i] = candidates[_electionId][i + 1];
        }
        return results;
    }
} 