# zkHolos - Privacy-Preserving E-Voting System

A blockchain-based e-voting system for local government elections in Ukraine, leveraging Zero-Knowledge Proofs and decentralized storage.

## Project Overview

zkHolos is a prototype implementation of a privacy-preserving e-voting system that aims to provide secure, transparent, and verifiable elections for local government in Ukraine. The system uses blockchain technology, Zero-Knowledge Proofs (ZKPs), and decentralized storage to ensure the integrity and privacy of votes.

## Features

- Secure voter registration and eligibility verification using ZKPs
- Privacy-preserving vote casting using Zero-Knowledge Proofs
- Region-based voting with privacy protection
- Transparent vote counting and result verification
- Smart contract-based election management
- Comprehensive testing suite with workflow tests
- Candidate status management (activation/deactivation)
- Election phase control (start, pause, resume, complete)
- Voter eligibility updates with ZKP verification

## Technical Stack

- Solidity (Smart Contracts)
- Hardhat (Development Environment)
- OpenZeppelin (Smart Contract Libraries)
- TypeScript (Testing and Deployment Scripts)
- circom (Zero-Knowledge Proof Circuits)
- snarkjs (ZKP Generation and Verification)

## Prerequisites

- Node.js (v16 or later)
- npm (v7 or later)
- Hardhat
- circom (for ZKP circuit compilation)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/ihbobul/zkHolos.git
cd zkHolos
```

2. Install dependencies:
```bash
npm install
```

3. Compile contracts and circuits:
```bash
# Compile Solidity contracts
npx hardhat compile

# Setup ZKP circuits
npm run setup:circuits
```

## Testing

The project includes comprehensive test suites:

```bash
# Run all tests
npx hardhat test

# Run specific test suites
npx hardhat test test/ElectionSystem.test.ts
npx hardhat test test/ZKPIntegration.test.ts
npx hardhat test test/ZKPWorkflow.test.ts

# Run workflow test
./scripts/runWorkflow.sh
```

## Zero-Knowledge Proofs

The system uses Zero-Knowledge Proofs for:
- Voter eligibility verification
- Privacy-preserving vote casting
- Region-based voting verification

ZKP circuits are located in the `circuits/` directory:
- `VoterEligibility.circom`: Circuit for voter eligibility verification

Scripts for ZKP operations are in `scripts/circuits/`:
- `generateProof.ts`: Generate ZK proofs
- `verifyProof.ts`: Verify ZK proofs
- `setupCircuit.ts`: Set up and compile circuits

## Contract Architecture

The system consists of five main smart contracts:

1. `VotingContract.sol`: Handles the core voting functionality
2. `VoterRegistration.sol`: Manages voter registration and eligibility
3. `ElectionManager.sol`: Coordinates between voting and registration contracts
4. `ZKPVerifier.sol`: Handles Zero-Knowledge Proof verification
5. `VoterEligibilityVerifier.sol`: Verifies voter eligibility proofs

## Security Considerations

- All contracts are audited and follow best practices
- Access control is implemented using OpenZeppelin's Ownable
- Reentrancy protection is in place
- Time-based constraints for election phases
- Privacy protection using Zero-Knowledge Proofs
- Secure voter eligibility verification
- Protection against double voting
- Region-based voting restrictions

## Development Roadmap

1. ✅ Blockchain Layer Implementation
2. ✅ Zero-Knowledge Proofs Integration
3. 🔄 Decentralized Storage Integration
4. 🔄 Frontend Development

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes using conventional commit messages
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

This is a prototype implementation and is not intended for production use without proper security audits and regulatory compliance.
