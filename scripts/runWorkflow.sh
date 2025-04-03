#!/bin/bash

# Kill any existing Hardhat node process
pkill -f "hardhat node" || true

# Start Hardhat node in the background
echo "Starting Hardhat node..."
npx hardhat node > /dev/null 2>&1 &
HARDHAT_PID=$!

# Wait for the node to start
sleep 5

# Run the workflow test
echo "Compiling..."
npx hardhat compile
echo "Running workflow test..."
npx hardhat run scripts/testWorkflow.ts --network localhost

# Kill the Hardhat node
echo "Stopping Hardhat node..."
kill $HARDHAT_PID || true 