import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import { 
  isMetaMaskInstalled, 
  getProvider, 
  getSigner, 
  getContractInstances,
  getSignedContractInstances,
  getCurrentAccount
} from '../utils/web3';

interface Web3ContextType {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  account: string | null;
  provider: ethers.providers.Web3Provider | null;
  contracts: Awaited<ReturnType<typeof getContractInstances>> | null;
  signedContracts: Awaited<ReturnType<typeof getSignedContractInstances>> | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  clearError: () => void;
}

const Web3Context = createContext<Web3ContextType>({
  isConnected: false,
  isLoading: false,
  error: null,
  account: null,
  provider: null,
  contracts: null,
  signedContracts: null,
  connect: async () => {},
  disconnect: () => {},
  clearError: () => {}
});

interface Web3ProviderProps {
  children: ReactNode;
}

const Web3ProviderComponent = ({ children }: Web3ProviderProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [contracts, setContracts] = useState<Awaited<ReturnType<typeof getContractInstances>> | null>(null);
  const [signedContracts, setSignedContracts] = useState<Awaited<ReturnType<typeof getSignedContractInstances>> | null>(null);

  // Initialize provider and contracts
  const initializeContracts = async (provider: ethers.providers.Web3Provider) => {
    try {
      const contractInstances = await getContractInstances();
      setContracts(contractInstances);
      
      const accounts = await provider.listAccounts();
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        setIsConnected(true);
        const signedContractInstances = await getSignedContractInstances();
        setSignedContracts(signedContractInstances);
      }
    } catch (error: any) {
      console.error("Error initializing contracts:", error);
      setError(error.message || 'Failed to initialize contracts');
      setIsConnected(false);
      setAccount(null);
      setContracts(null);
      setSignedContracts(null);
    }
  };

  // Initialize provider
  useEffect(() => {
    const initProvider = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          setIsLoading(true);
          setError(null);
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          setProvider(provider);

          // Initialize contracts
          await initializeContracts(provider);
        } catch (error: any) {
          console.error("Error initializing provider:", error);
          setError(error.message || 'Failed to initialize Web3 provider');
        } finally {
          setIsLoading(false);
        }
      }
    };

    initProvider();
  }, []);

  // Connect to MetaMask
  const connect = async () => {
    if (typeof window.ethereum === 'undefined') {
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      setProvider(provider);

      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const account = accounts[0];
      setAccount(account);
      
      // Initialize contracts
      await initializeContracts(provider);
    } catch (error: any) {
      console.error("Error connecting to MetaMask:", error);
      setError(error.message || 'Failed to connect to MetaMask');
      setIsConnected(false);
      setAccount(null);
      setContracts(null);
      setSignedContracts(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect from MetaMask
  const disconnect = () => {
    setIsConnected(false);
    setAccount(null);
    setContracts(null);
    setSignedContracts(null);
    setError(null);
  };

  // Clear error
  const clearError = () => {
    setError(null);
  };

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnect();
        } else {
          setAccount(accounts[0]);
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });

      window.ethereum.on('disconnect', () => {
        disconnect();
      });

      // Clean up listeners
      return () => {
        window.ethereum.removeListener('accountsChanged', () => {});
        window.ethereum.removeListener('chainChanged', () => {});
        window.ethereum.removeListener('disconnect', () => {});
      };
    }
  }, []);

  return (
    <Web3Context.Provider
      value={{
        isConnected,
        isLoading,
        error,
        account,
        provider,
        contracts,
        signedContracts,
        connect,
        disconnect,
        clearError
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};

// Custom hook to use Web3 context
const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

export { useWeb3, Web3ProviderComponent as Web3Provider }; 