import { http, createConfig } from 'wagmi';
import { mainnet, hardhat } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

// Create wagmi config
export const config = createConfig({
  chains: [hardhat, mainnet],
  connectors: [
    injected(),
  ],
  transports: {
    [hardhat.id]: http(),
    [mainnet.id]: http(),
  },
}); 