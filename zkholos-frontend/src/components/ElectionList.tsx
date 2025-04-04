import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { useWeb3 } from '../contexts/Web3Context';
import { BigNumber } from 'ethers';
import { fetchFromIPFS, checkIPFSConnection, IPFSElectionData } from '../utils/ipfs';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { formatDate, formatVoteCount, isElectionActive } from '../lib/utils';
import { ethers } from 'ethers';

interface ElectionListProps {
  onSelectElection: (electionId: number) => void;
}

interface Election {
  id: number;
  title: string;
  description: string;
  startTime: number;
  endTime: number;
  isActive: boolean;
  isCompleted: boolean;
  totalVotes: number;
  regions: string[];
  ipfsHash: string;
  ipfsData?: IPFSElectionData;
}

interface Candidate {
  id: number;
  name: string;
  description: string;
  voteCount: number;
  isActive: boolean;
}

// Helper function to get candidates from IPFS data
const getCandidates = (election: Election) => {
  return election.ipfsData?.candidates || [];
};

export function ElectionList({ onSelectElection }: ElectionListProps) {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isConnected, connect, contracts, signedContracts, isLoading: web3Loading } = useWeb3();

  useEffect(() => {
    const fetchElections = async () => {
      if (!isConnected || !contracts || !signedContracts) {
        console.log('Not connected or contracts not available:', { isConnected, contracts: !!contracts, signedContracts: !!signedContracts });
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Debug contract state
        console.log('Contract addresses:', {
          votingContract: contracts.votingContract.address,
          signer: await signedContracts.votingContract.signer.getAddress()
        });

        // Verify contract code exists
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const code = await provider.getCode(contracts.votingContract.address);
        console.log('Contract code length:', code.length);
        if (code === '0x') {
          throw new Error('VotingContract not found at specified address. Please check your network and contract deployment.');
        }

        // Debug contract interface
        console.log('VotingContract interface:', {
          functions: Object.keys(contracts.votingContract.interface.functions),
          fragments: contracts.votingContract.interface.fragments.map(f => f.format())
        });

        // Get election count using the getElectionsLength function
        console.log('Attempting to get election count...');
        const electionCount = await contracts.votingContract.getElectionsLength();
        console.log('Election count:', electionCount.toString());

        const fetchedElections: Election[] = [];

        // Fetch each election using getElection function
        // Note: Elections use 1-based IDs
        for (let i = 1; i <= electionCount.toNumber(); i++) {
          try {
            console.log(`Fetching election ${i}...`);
            const electionData = await contracts.votingContract.getElection(i);
            console.log(`Election ${i} data:`, electionData);

            // Only process if the election data is valid
            if (electionData) {
              // Fetch additional data from IPFS if available
              let ipfsData = null;
              if (electionData.ipfsHash) {
                try {
                  ipfsData = await fetchFromIPFS(electionData.ipfsHash);
                  console.log(`IPFS data for election ${i}:`, ipfsData);
                } catch (ipfsError) {
                  console.warn(`Failed to fetch IPFS data for election ${i}:`, ipfsError);
                }
              }

              fetchedElections.push({
                id: electionData.id.toNumber(),
                title: electionData.title,
                description: electionData.description,
                startTime: electionData.startTime.toNumber(),
                endTime: electionData.endTime.toNumber(),
                isActive: electionData.isActive,
                isCompleted: electionData.isCompleted,
                totalVotes: electionData.totalVotes.toNumber(),
                regions: electionData.regions || [],
                ipfsHash: electionData.ipfsHash,
                ipfsData: ipfsData || undefined
              });
            }
          } catch (electionError) {
            console.error(`Error fetching election ${i}:`, electionError);
            // Add more debug information
            if (electionError instanceof Error) {
              console.error('Error details:', {
                message: electionError.message,
                name: electionError.name,
                stack: electionError.stack
              });
            }
          }
        }

        // Sort elections by ID to maintain consistent order
        fetchedElections.sort((a, b) => a.id - b.id);
        setElections(fetchedElections);
      } catch (error: any) {
        console.error('Error fetching elections:', error);
        setError(`Failed to fetch elections: ${error.message || error}. Code: ${error.code}, Method: ${error.method}`);
      } finally {
        setLoading(false);
      }
    };

    fetchElections();
  }, [isConnected, contracts, signedContracts]);

  if (!isConnected) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
        <p className="mb-4">Please connect your wallet to view elections.</p>
        <Button 
          onClick={connect}
          disabled={web3Loading}
        >
          {web3Loading ? 'Connecting...' : 'Connect Wallet'}
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center p-8">
        <p>Loading elections...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (elections.length === 0) {
    return (
      <div className="text-center p-8">
        <p>No elections found.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {elections.map((election) => (
        <Card key={election.id} className="flex flex-col">
          <CardHeader>
            <CardTitle>{election.title}</CardTitle>
            <CardDescription>{election.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="space-y-2">
              <p><strong>Status:</strong> {isElectionActive(election.startTime, election.endTime) ? 'Active' : 'Inactive'}</p>
              <p><strong>Total Votes:</strong> {formatVoteCount(election.totalVotes)}</p>
              <p><strong>Regions:</strong> {election.regions.join(', ')}</p>
              <p><strong>Candidates:</strong> {getCandidates(election).length}</p>
              <p><strong>Start:</strong> {formatDate(election.startTime)}</p>
              <p><strong>End:</strong> {formatDate(election.endTime)}</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              variant="default" 
              className="w-full"
              onClick={() => onSelectElection(election.id)}
            >
              View Details
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
} 