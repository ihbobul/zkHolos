#!/bin/bash

# Function to check if a process is running
is_process_running() {
    pgrep -f "$1" >/dev/null
}

# Function to wait for IPFS to be ready
wait_for_ipfs() {
    echo "Waiting for IPFS to be ready..."
    for i in {1..30}; do
        if curl -s http://localhost:5001/api/v0/version >/dev/null; then
            echo "IPFS is ready!"
            return 0
        fi
        sleep 1
    done
    echo "IPFS failed to start"
    return 1
}

# Kill any running processes
echo "Cleaning up previous processes..."
if is_process_running "hardhat node"; then
    echo "Killing existing Hardhat node..."
    pkill -f "hardhat node"
fi

if is_process_running "ipfs daemon"; then
    echo "Killing existing IPFS daemon..."
    pkill -f "ipfs daemon"
fi

# Wait for processes to fully stop
sleep 2

# Initialize and configure IPFS
echo "Configuring IPFS..."
if [ ! -d "$HOME/.ipfs" ]; then
    ipfs init
fi

# Configure IPFS with CORS settings
echo "Setting up IPFS CORS..."
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "*"]'
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["PUT", "POST", "GET", "OPTIONS"]'
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Headers '["Authorization", "Content-Type", "X-Requested-With", "X-Stream-Output", "X-Chunked-Output", "Access-Control-Allow-Origin", "Access-Control-Allow-Methods", "Access-Control-Allow-Headers"]'
ipfs config --json API.HTTPHeaders.Access-Control-Expose-Headers '["Location", "X-Stream-Output", "X-Chunked-Output"]'
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Credentials '["true"]'

# Start IPFS daemon and wait for it to be ready
echo "Starting IPFS daemon..."
ipfs daemon > ipfs.log 2>&1 &
IPFS_PID=$!

# Wait for IPFS to be ready
wait_for_ipfs || {
    echo "Failed to start IPFS"
    exit 1
}

# Start Hardhat node
echo "Starting Hardhat node..."
npx hardhat node > hardhat.log 2>&1 &
HARDHAT_PID=$!

# Wait for Hardhat node to be ready
sleep 5

# Compile and deploy contracts
echo "Compiling contracts..."
npx hardhat compile

echo "Running setup script..."
npx hardhat run scripts/setup-dev-environment.ts --network localhost

# Check if setup was successful
if [ $? -eq 0 ]; then
    echo "Setup completed successfully!"
    
    # Start the frontend
    echo "Starting frontend..."
    cd zkholos-frontend && npm run dev
else
    echo "Setup failed. Check hardhat.log for details."
    tail -n 20 hardhat.log
    kill $IPFS_PID $HARDHAT_PID 2>/dev/null
    exit 1
fi

# Handle cleanup on script exit
trap 'kill $IPFS_PID $HARDHAT_PID 2>/dev/null' EXIT

# Keep the script running
wait 