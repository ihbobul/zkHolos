// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract VoterRegistration is Ownable, Pausable {
    struct VoterInfo {
        bool isRegistered;
        bool isEligible;
        string region;
        uint256 registrationTime;
        uint256 lastUpdateTime;
    }

    mapping(address => VoterInfo) public voters;
    mapping(string => uint256) public regionVoterCount;
    address[] private registeredVoters;
    uint256 public totalRegisteredVoters;

    event VoterRegistered(address indexed voter, string region);
    event VoterRemoved(address indexed voter);
    event VoterEligibilityUpdated(address indexed voter, bool isEligible);
    event VoterRegionUpdated(address indexed voter, string newRegion);

    constructor() {
        _transferOwnership(msg.sender);
    }

    function registerVoter(address _voter, string memory _region) external onlyOwner whenNotPaused {
        require(_voter != address(0), "Invalid voter address");
        require(bytes(_region).length > 0, "Region cannot be empty");
        require(!voters[_voter].isRegistered, "Voter already registered");

        voters[_voter] = VoterInfo({
            isRegistered: true,
            isEligible: true,
            region: _region,
            registrationTime: block.timestamp,
            lastUpdateTime: block.timestamp
        });

        regionVoterCount[_region]++;
        registeredVoters.push(_voter);
        totalRegisteredVoters++;

        emit VoterRegistered(_voter, _region);
    }

    function removeVoter(address _voter) external onlyOwner whenNotPaused {
        require(voters[_voter].isRegistered, "Voter not registered");

        string memory region = voters[_voter].region;
        regionVoterCount[region]--;

        // Remove from registered voters array
        for (uint256 i = 0; i < registeredVoters.length; i++) {
            if (registeredVoters[i] == _voter) {
                registeredVoters[i] = registeredVoters[registeredVoters.length - 1];
                registeredVoters.pop();
                break;
            }
        }

        delete voters[_voter];
        totalRegisteredVoters--;

        emit VoterRemoved(_voter);
    }

    function updateVoterEligibility(address _voter, bool _isEligible) external onlyOwner whenNotPaused {
        require(voters[_voter].isRegistered, "Voter not registered");
        require(voters[_voter].isEligible != _isEligible, "Eligibility status unchanged");

        voters[_voter].isEligible = _isEligible;
        voters[_voter].lastUpdateTime = block.timestamp;

        emit VoterEligibilityUpdated(_voter, _isEligible);
    }

    function updateVoterRegion(address _voter, string memory _newRegion) external onlyOwner whenNotPaused {
        require(voters[_voter].isRegistered, "Voter not registered");
        require(bytes(_newRegion).length > 0, "Region cannot be empty");
        require(keccak256(bytes(voters[_voter].region)) != keccak256(bytes(_newRegion)), "Region unchanged");

        string memory oldRegion = voters[_voter].region;
        regionVoterCount[oldRegion]--;
        regionVoterCount[_newRegion]++;

        voters[_voter].region = _newRegion;
        voters[_voter].lastUpdateTime = block.timestamp;

        emit VoterRegionUpdated(_voter, _newRegion);
    }

    function isRegisteredVoter(address _voter) external view returns (bool) {
        return voters[_voter].isRegistered;
    }

    function isVoterEligible(address _voter) external view returns (bool) {
        return voters[_voter].isRegistered && voters[_voter].isEligible;
    }

    function getVoterInfo(address _voter) external view returns (
        bool isRegistered,
        bool isEligible,
        string memory region,
        uint256 registrationTime,
        uint256 lastUpdateTime
    ) {
        VoterInfo storage info = voters[_voter];
        return (
            info.isRegistered,
            info.isEligible,
            info.region,
            info.registrationTime,
            info.lastUpdateTime
        );
    }

    function getRegionVoterCount(string memory _region) external view returns (uint256) {
        return regionVoterCount[_region];
    }

    function getRegisteredVoters() external view returns (address[] memory) {
        return registeredVoters;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
} 