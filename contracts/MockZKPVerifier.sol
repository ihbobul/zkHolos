// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract MockZKPVerifier is Ownable {
    bool public mockVerificationResult;
    
    constructor() {
        _transferOwnership(msg.sender);
    }
    
    function setMockVerification(bool _result) external onlyOwner {
        mockVerificationResult = _result;
    }
    
    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[2] memory input,
        uint256 _electionId,
        bytes32 commitment
    ) external view returns (bool) {
        return mockVerificationResult;
    }
} 