// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract ZKPVerifier is Ownable {
    // Verifier contract address
    address public verifierContract;
    
    // Mapping to track used commitments
    mapping(uint256 => mapping(bytes32 => bool)) public usedCommitments;
    
    event VerifierContractUpdated(address indexed oldVerifier, address indexed newVerifier);
    event ProofVerified(uint256 indexed electionId, bytes32 commitment, bool isValid);
    
    constructor(address _verifierContract) {
        require(_verifierContract != address(0), "Invalid verifier contract address");
        verifierContract = _verifierContract;
    }
    
    function updateVerifierContract(address _newVerifierContract) external onlyOwner {
        require(_newVerifierContract != address(0), "Invalid verifier contract address");
        address oldVerifier = verifierContract;
        verifierContract = _newVerifierContract;
        emit VerifierContractUpdated(oldVerifier, _newVerifierContract);
    }
    
    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[2] memory input,
        uint256 electionId,
        bytes32 commitment
    ) external returns (bool) {
        require(!usedCommitments[electionId][commitment], "Commitment already used");
        
        // Call the verifier contract
        (bool success, bytes memory result) = verifierContract.call(
            abi.encodeWithSignature(
                "verifyProof(uint256[2],uint256[2][2],uint256[2],uint256[2])",
                a, b, c, input
            )
        );
        
        require(success, "Verification failed");
        bool isValid = abi.decode(result, (bool));
        
        if (isValid) {
            usedCommitments[electionId][commitment] = true;
        }
        
        emit ProofVerified(electionId, commitment, isValid);
        return isValid;
    }
    
    function isCommitmentUsed(uint256 electionId, bytes32 commitment) external view returns (bool) {
        return usedCommitments[electionId][commitment];
    }
} 