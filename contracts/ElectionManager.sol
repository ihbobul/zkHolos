// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./VotingContract.sol";
import "./VoterRegistration.sol";
import "./VoterEligibilityVerifier.sol";

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

    struct Election {
        string name;
        uint256 startTime;
        uint256 endTime;
        bool isActive;
        uint256 totalVotes;
    }

    VotingContract public votingContract;
    VoterRegistration public voterRegistration;
    VoterEligibilityVerifier public verifier;
    mapping(uint256 => ElectionState) public electionStates;
    mapping(uint256 => mapping(address => bool)) public eligibleVoters;
    mapping(uint256 => Election) public elections;
    uint256 public electionCount;

    event ElectionManagerInitialized(address votingContract, address voterRegistration);
    event ElectionPhaseChanged(uint256 indexed electionId, ElectionPhase newPhase);
    event EligibleVotersUpdated(uint256 indexed electionId, uint256 count);
    event ElectionPaused(uint256 indexed electionId);
    event ElectionResumed(uint256 indexed electionId);
    event ElectionCreated(uint256 indexed electionId, string name, uint256 startTime, uint256 endTime);
    event VoteCast(uint256 indexed electionId, address indexed voter);
    event ElectionEnded(uint256 indexed electionId);
    event DebugVoteAttempt(uint256 indexed electionId, address indexed voter, uint256 candidateId, string region, bool isEligible, bool isActive, bool isPaused);

    constructor(address _votingContract, address _voterRegistration, address _verifier) {
        _transferOwnership(msg.sender);
        votingContract = VotingContract(_votingContract);
        voterRegistration = VoterRegistration(_voterRegistration);
        verifier = VoterEligibilityVerifier(_verifier);
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

        // Set the ZKP verifier after ownership transfer
        votingContract.setZKPVerifier(address(verifier));
    }

    function createElection(
        string memory _name,
        uint256 _startTime,
        uint256 _endTime,
        string[] memory _regions
    ) public onlyOwner {
        require(_startTime > block.timestamp, "Start time must be in the future");
        require(_endTime > _startTime, "End time must be after start time");
        require(_regions.length > 0, "At least one region must be specified");

        // Create election in VotingContract first to get its ID
        uint256 electionId = votingContract.createElection(
            _name,
            "",
            _startTime,
            _endTime,
            _regions
        );

        // Use the same ID from VotingContract
        electionCount = electionId;

        Election storage election = elections[electionId];
        election.name = _name;
        election.startTime = _startTime;
        election.endTime = _endTime;
        election.isActive = true;

        electionStates[electionId] = ElectionState({
            id: electionId,
            phase: ElectionPhase.Registration,
            startTime: _startTime,
            endTime: _endTime,
            totalEligibleVoters: 0,
            isPaused: false
        });

        emit ElectionCreated(electionId, _name, _startTime, _endTime);
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
            if (voterRegistration.isEligible(voters[i])) {
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

    function castVoteWithProof(
        uint256 _electionId,
        uint256 _candidateId,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[2] memory input
    ) public {
        ElectionState storage state = electionStates[_electionId];
        require(state.phase == ElectionPhase.Active, "Election not active");
        require(!state.isPaused, "Election is paused");
        
        bool isEligible = voterRegistration.isEligible(msg.sender);
        require(isEligible, "Voter not eligible");
        
        bytes32 commitment = keccak256(abi.encodePacked(msg.sender, _electionId));
        require(verifier.verifyProof(
            a, 
            b, 
            c, 
            input,
            _electionId,
            commitment
        ), "Invalid proof");

        // Get voter's region from voter info
        (string memory voterRegion,,, ) = voterRegistration.getVoterInfo(msg.sender);
        
        // Cast vote in VotingContract using castVoteWithProof
        try votingContract.castVoteWithProof(
            _electionId,
            _candidateId,
            a,
            b,
            c,
            input,
            commitment,
            voterRegion,
            msg.sender
        ) {
            emit DebugVoteAttempt(_electionId, msg.sender, _candidateId, voterRegion, isEligible, state.phase == ElectionPhase.Active, state.isPaused);
            emit VoteCast(_electionId, msg.sender);
        } catch {
            revert("Failed to cast vote");
        }
    }

    function castVote(
        uint256 _electionId,
        uint256 _candidateId,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[2] memory input
    ) public {
        return castVoteWithProof(_electionId, _candidateId, a, b, c, input);
    }

    function hasVoted(uint256 _electionId, address _voter) public view returns (bool) {
        return votingContract.hasVoted(_electionId, _voter);
    }

    function getElectionInfo(uint256 _electionId)
        public
        view
        returns (
            string memory name,
            uint256 startTime,
            uint256 endTime,
            bool isActive,
            uint256 totalVotes
        )
    {
        Election storage election = elections[_electionId];
        return (
            election.name,
            election.startTime,
            election.endTime,
            election.isActive,
            election.totalVotes
        );
    }

    function getEligibleVoterCount() public view returns (uint256) {
        address[] memory voters = voterRegistration.getRegisteredVoters();
        uint256 count = 0;
        for (uint256 i = 0; i < voters.length; i++) {
            if (voterRegistration.isEligible(voters[i])) {
                count++;
            }
        }
        return count;
    }

    function setVotingContractZKPVerifier(address _verifier) external onlyOwner {
        require(_verifier != address(0), "Invalid verifier address");
        votingContract.setZKPVerifier(_verifier);
    }
} 