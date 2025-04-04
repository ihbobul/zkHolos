#!/bin/bash

# Start IPFS daemon in the background
ipfs daemon &

# Wait for IPFS to start
sleep 5

# Start the frontend application
npm run dev 