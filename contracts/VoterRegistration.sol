// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./VoterEligibilityVerifier.sol";

contract VoterRegistration is Ownable {
    struct Voter {
        string region;
        bool isRegistered;
        bool isEligible;
        uint256 registrationTime;
    }

    VoterEligibilityVerifier public verifier;
    mapping(address => Voter) public voters;
    mapping(string => uint256) public regionVoterCounts;
    address[] private registeredVoters;

    event VoterRegistered(address indexed voter, string region);
    event VoterEligibilityUpdated(address indexed voter, bool isEligible);

    constructor(address _verifier) {
        verifier = VoterEligibilityVerifier(_verifier);
    }

    function registerVoter(
        string memory _region,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[2] memory input
    ) public {
        require(!voters[msg.sender].isRegistered, "Already registered");
        require(verifier.verifyProof(
            a, 
            b, 
            c, 
            input,
            0, // electionId (0 for registration)
            keccak256(abi.encodePacked(msg.sender, _region)) // commitment
        ), "Invalid proof");

        voters[msg.sender] = Voter({
            region: _region,
            isRegistered: true,
            isEligible: true,
            registrationTime: block.timestamp
        });

        regionVoterCounts[_region]++;
        registeredVoters.push(msg.sender);

        emit VoterRegistered(msg.sender, _region);
    }

    function updateEligibility(
        address _voter,
        bool _isEligible,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[2] memory input
    ) public onlyOwner {
        require(voters[_voter].isRegistered, "Voter not registered");
        require(verifier.verifyProof(
            a, 
            b, 
            c, 
            input,
            0, // electionId (0 for eligibility update)
            keccak256(abi.encodePacked(_voter, _isEligible)) // commitment
        ), "Invalid proof");

        voters[_voter].isEligible = _isEligible;

        emit VoterEligibilityUpdated(_voter, _isEligible);
    }

    function isRegistered(address _voter) public view returns (bool) {
        return voters[_voter].isRegistered;
    }

    function isEligible(address _voter) public view returns (bool) {
        return voters[_voter].isEligible;
    }

    function getVoterInfo(address _voter)
        public
        view
        returns (
            string memory region,
            bool registered,
            bool eligible,
            uint256 registrationTime
        )
    {
        Voter memory voter = voters[_voter];
        return (voter.region, voter.isRegistered, voter.isEligible, voter.registrationTime);
    }

    function getRegionVoterCount(string memory _region) public view returns (uint256) {
        return regionVoterCounts[_region];
    }

    function getRegisteredVoters() public view returns (address[] memory) {
        return registeredVoters;
    }
} 