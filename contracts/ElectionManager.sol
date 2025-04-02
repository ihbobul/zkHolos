// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./VotingContract.sol";
import "./VoterRegistration.sol";

contract ElectionManager is Ownable, Initializable, Pausable {
    enum ElectionPhase {
        Registration,
        Active,
        Completed
    }

    struct ElectionState {
        uint256 id;
        ElectionPhase phase;
        uint256 startTime;
        uint256 endTime;
        uint256 totalEligibleVoters;
        bool isPaused;
    }

    VotingContract public votingContract;
    VoterRegistration public voterRegistration;
    uint256 public electionCount;
    mapping(uint256 => ElectionState) public electionStates;
    mapping(uint256 => mapping(address => bool)) public eligibleVoters;

    event ElectionManagerInitialized(address votingContract, address voterRegistration);
    event ElectionPhaseChanged(uint256 indexed electionId, ElectionPhase newPhase);
    event EligibleVotersUpdated(uint256 indexed electionId, uint256 count);
    event ElectionPaused(uint256 indexed electionId);
    event ElectionResumed(uint256 indexed electionId);

    constructor() {
        _transferOwnership(msg.sender);
    }

    function initialize(
        address _votingContract,
        address _voterRegistration
    ) external initializer {
        require(_votingContract != address(0), "Invalid voting contract address");
        require(_voterRegistration != address(0), "Invalid voter registration address");

        votingContract = VotingContract(_votingContract);
        voterRegistration = VoterRegistration(_voterRegistration);

        // Transfer ownership of VotingContract to ElectionManager
        if (votingContract.owner() != address(this)) {
            require(
                votingContract.owner() == msg.sender,
                "Caller must be the owner of VotingContract"
            );
            votingContract.transferOwnership(address(this));
        }
    }

    function createElection(
        string memory _title,
        string memory _description,
        uint256 _startTime,
        uint256 _endTime,
        string[] memory _regions
    ) external onlyOwner whenNotPaused returns (uint256) {
        require(_endTime > _startTime, "End time must be after start time");
        require(_startTime > block.timestamp, "Start time must be in the future");

        electionCount++;
        uint256 electionId = electionCount;

        electionStates[electionId] = ElectionState({
            id: electionId,
            phase: ElectionPhase.Registration,
            startTime: _startTime,
            endTime: _endTime,
            totalEligibleVoters: 0,
            isPaused: false
        });

        // Create election in VotingContract
        votingContract.createElection(
            _title,
            _description,
            _startTime,
            _endTime,
            _regions
        );

        return electionId;
    }

    function addCandidate(
        uint256 _electionId,
        string memory _name,
        string memory _description
    ) external onlyOwner whenNotPaused {
        require(_electionId <= electionCount, "Invalid election ID");
        ElectionState storage state = electionStates[_electionId];
        require(state.phase == ElectionPhase.Registration, "Election not in registration phase");

        votingContract.addCandidate(_electionId, _name, _description);
    }

    function updateEligibleVoters(uint256 _electionId) external onlyOwner whenNotPaused {
        require(_electionId <= electionCount, "Invalid election ID");
        ElectionState storage state = electionStates[_electionId];
        require(state.phase == ElectionPhase.Registration, "Election not in registration phase");

        uint256 count = 0;
        address[] memory voters = voterRegistration.getRegisteredVoters();
        
        for (uint256 i = 0; i < voters.length; i++) {
            if (voterRegistration.isVoterEligible(voters[i])) {
                eligibleVoters[_electionId][voters[i]] = true;
                count++;
            }
        }

        state.totalEligibleVoters = count;
        emit EligibleVotersUpdated(_electionId, count);
    }

    function startElectionPhase(uint256 _electionId) external onlyOwner whenNotPaused {
        require(_electionId <= electionCount, "Invalid election ID");
        ElectionState storage state = electionStates[_electionId];
        require(state.phase == ElectionPhase.Registration, "Election not in registration phase");
        require(block.timestamp >= state.startTime, "Election has not started yet");
        require(state.totalEligibleVoters > 0, "No eligible voters");

        state.phase = ElectionPhase.Active;
        votingContract.startElection(_electionId);
        emit ElectionPhaseChanged(_electionId, ElectionPhase.Active);
    }

    function completeElection(uint256 _electionId) external onlyOwner whenNotPaused {
        require(_electionId <= electionCount, "Invalid election ID");
        ElectionState storage state = electionStates[_electionId];
        require(state.phase == ElectionPhase.Active, "Election not active");
        require(block.timestamp >= state.endTime, "Election has not ended yet");

        state.phase = ElectionPhase.Completed;
        votingContract.completeElection(_electionId);
        emit ElectionPhaseChanged(_electionId, ElectionPhase.Completed);
    }

    function pauseElection(uint256 _electionId) external onlyOwner {
        require(_electionId <= electionCount, "Invalid election ID");
        ElectionState storage state = electionStates[_electionId];
        require(state.phase == ElectionPhase.Active, "Election not active");
        require(!state.isPaused, "Election already paused");

        state.isPaused = true;
        votingContract.pauseElection(_electionId);
        _pause();
        emit ElectionPaused(_electionId);
    }

    function resumeElection(uint256 _electionId) external onlyOwner {
        require(_electionId <= electionCount, "Invalid election ID");
        ElectionState storage state = electionStates[_electionId];
        require(state.isPaused, "Election not paused");
        require(state.phase == ElectionPhase.Active, "Election not active");
        require(block.timestamp < state.endTime, "Election has ended");

        state.isPaused = false;
        votingContract.resumeElection(_electionId);
        _unpause();
        emit ElectionResumed(_electionId);
    }

    function isElectionActive(uint256 _electionId) external view returns (bool) {
        require(_electionId <= electionCount, "Invalid election ID");
        ElectionState storage state = electionStates[_electionId];
        return state.phase == ElectionPhase.Active && !state.isPaused;
    }

    function isElectionCompleted(uint256 _electionId) external view returns (bool) {
        require(_electionId <= electionCount, "Invalid election ID");
        return electionStates[_electionId].phase == ElectionPhase.Completed;
    }

    function getElectionState(uint256 _electionId) external view returns (
        uint256 id,
        ElectionPhase phase,
        uint256 startTime,
        uint256 endTime,
        uint256 totalEligibleVoters,
        bool isPaused
    ) {
        ElectionState storage state = electionStates[_electionId];
        return (
            state.id,
            state.phase,
            state.startTime,
            state.endTime,
            state.totalEligibleVoters,
            state.isPaused
        );
    }

    function updateCandidateStatus(
        uint256 _electionId,
        uint256 _candidateId,
        bool _isActive
    ) external onlyOwner whenNotPaused {
        require(_electionId <= electionCount, "Invalid election ID");
        ElectionState storage state = electionStates[_electionId];
        require(state.phase == ElectionPhase.Registration, "Election not in registration phase");
        
        votingContract.updateCandidateStatus(_electionId, _candidateId, _isActive);
    }
} 