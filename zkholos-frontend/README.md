# zkHolos Frontend

A modern React application for the zkHolos voting platform, built with Vite and Shadcn UI.

## Features

- View all elections in a grid layout
- View detailed information about each election
- Cast votes using zero-knowledge proofs
- Real-time updates of election status and vote counts
- Responsive design for all screen sizes

## Prerequisites

- Node.js (v16 or higher)
- IPFS daemon
- Local Hardhat network running
- MetaMask or another Web3 wallet

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Development

To start the development server:

1. Make sure IPFS daemon is running
2. Make sure your local Hardhat network is running
3. Run the development server:
   ```bash
   npm run dev
   ```

Or use the provided start script that handles both IPFS and the frontend:
```bash
./start.sh
```

## Building for Production

To create a production build:

```bash
npm run build
```

The built files will be in the `dist` directory.

## Contract Addresses

The application is configured to work with the following contract addresses on the local Hardhat network:

- ElectionManager: `0x2bdCC0de6bE1f7D2ee689a0342D76F52E8EFABa3`
- VotingContract: `0x82e01223d51Eb87e16A03E24687EDF0F294da6f1`
- VoterRegistration: `0xCD8a1C3ba11CF5ECfa6267617243239504a98d90`

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request
