import { ethers } from 'ethers';
import { ContractEventListener } from '../src/services/ContractEventListener';
import { VotingContract } from '../typechain-types/contracts/VotingContract';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
    try {
        // Connect to the network
        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://localhost:8545');
        
        // Get the contract address from environment or use a default
        const contractAddress = process.env.VOTING_CONTRACT_ADDRESS;
        if (!contractAddress) {
            throw new Error('VOTING_CONTRACT_ADDRESS environment variable is not set');
        }

        // Get the contract ABI
        const contractABI = require('../artifacts/contracts/VotingContract.sol/VotingContract.json').abi;

        // Create and start the event listener
        const eventListener = ContractEventListener.getInstance(provider, contractAddress, contractABI);
        await eventListener.startListening();

        console.log('Contract event listener started successfully');
        console.log('Listening for events...');

        // Keep the process running
        process.on('SIGINT', () => {
            console.log('Stopping event listener...');
            eventListener.stopListening();
            process.exit(0);
        });

    } catch (error) {
        console.error('Error starting contract event listener:', error);
        process.exit(1);
    }
}

main(); 