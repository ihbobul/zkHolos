import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { AlertCircle } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { formatDate, formatVoteCount, formatPercentage, isElectionActive } from '../lib/utils';
import { fetchFromIPFS, type IPFSElectionData } from '../utils/ipfs';

interface ElectionDetailsProps {
  electionId: number;
}

interface Election {
  id: number;
  title: string;
  description: string;
  startTime: number;
  endTime: number;
  regions: string[];
  candidates: Candidate[];
  ipfsHash: string;
  isActive: boolean;
  totalVotes: number;
}

interface Candidate {
  id: number;
  name: string;
  description: string;
  voteCount: number;
  isActive: boolean;
}

export function ElectionDetails({ electionId }: ElectionDetailsProps) {
  const [election, setElection] = useState<Election | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const { signedContracts, isConnected, connect, isLoading: web3Loading, error: web3Error } = useWeb3();

  useEffect(() => {
    const fetchElectionDetails = async () => {
      try {
        if (!signedContracts) {
          throw new Error('Contracts not available');
        }

        const electionData = await signedContracts.votingContract.getElection(electionId);
        
        if (!electionData.ipfsHash) {
          throw new Error('No IPFS data available for this election');
        }

        const ipfsData: IPFSElectionData = await fetchFromIPFS(electionData.ipfsHash);

        setElection({
          id: electionId,
          title: electionData.title,
          description: electionData.description,
          startTime: electionData.startTime.toNumber(),
          endTime: electionData.endTime.toNumber(),
          regions: electionData.regions,
          candidates: ipfsData.candidates,
          ipfsHash: electionData.ipfsHash,
          isActive: electionData.isActive,
          totalVotes: electionData.totalVotes.toNumber()
        });
      } catch (error: any) {
        console.error('Error fetching election details:', error);
        setError(error.message || 'Failed to fetch election details');
      } finally {
        setLoading(false);
      }
    };

    fetchElectionDetails();
  }, [electionId, signedContracts]);

  const handleVote = async () => {
    if (!selectedCandidate || !election || !signedContracts) return;

    try {
      setIsVoting(true);
      // Mock ZKP proof parameters
      const mockProof = {
        a: [1, 1],
        b: [[1, 1], [1, 1]],
        c: [1, 1],
        input: [1, 1]
      };

      const tx = await signedContracts.electionManager.castVote(
        electionId,
        selectedCandidate,
        mockProof.a,
        mockProof.b,
        mockProof.c,
        mockProof.input
      );

      await tx.wait();
      alert('Vote cast successfully!');
    } catch (error) {
      console.error('Error casting vote:', error);
      alert('Error casting vote. Please try again.');
    } finally {
      setIsVoting(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
        <p className="mb-4">Please connect your wallet to view election details and vote.</p>
        <Button 
          onClick={connect}
          disabled={web3Loading}
        >
          {web3Loading ? 'Connecting...' : 'Connect Wallet'}
        </Button>
        {web3Error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Connection Error</AlertTitle>
            <AlertDescription>{web3Error}</AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  if (loading || web3Loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-lg">Loading election details...</div>
      </div>
    );
  }

  if (error || web3Error) {
    return (
      <Alert variant="destructive" className="mx-auto max-w-2xl mt-8">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error || web3Error}</AlertDescription>
      </Alert>
    );
  }

  if (!election) {
    return (
      <Alert variant="destructive" className="mx-auto max-w-2xl mt-8">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Election Not Found</AlertTitle>
        <AlertDescription>The requested election could not be found.</AlertDescription>
      </Alert>
    );
  }

  const isElectionActive = election.isActive && 
    Date.now() / 1000 >= election.startTime && 
    Date.now() / 1000 <= election.endTime;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>{election.title}</CardTitle>
          <CardDescription>{election.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Election Information</h3>
              <p><strong>Status:</strong> {isElectionActive ? 'Active' : 'Inactive'}</p>
              <p><strong>Total Votes:</strong> {formatVoteCount(election.totalVotes)}</p>
              <p><strong>Regions:</strong> {election.regions.join(', ')}</p>
              <p><strong>Start Time:</strong> {formatDate(election.startTime)}</p>
              <p><strong>End Time:</strong> {formatDate(election.endTime)}</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold">Candidates</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                {election.candidates.map((candidate) => (
                  <Card key={candidate.id}>
                    <CardContent className="pt-6">
                      <div className="space-y-2">
                        <h4 className="font-medium">{candidate.name}</h4>
                        <p className="text-sm text-muted-foreground">{candidate.description}</p>
                        <p>
                          <strong>Votes:</strong> {formatVoteCount(candidate.voteCount)}
                          {election.totalVotes > 0 && (
                            <span className="text-sm text-muted-foreground ml-2">
                              ({formatPercentage(candidate.voteCount, election.totalVotes)})
                            </span>
                          )}
                        </p>
                        <Button
                          variant={selectedCandidate === candidate.id ? "default" : "outline"}
                          className="w-full mt-2"
                          onClick={() => setSelectedCandidate(candidate.id)}
                          disabled={!isElectionActive || isVoting}
                        >
                          {selectedCandidate === candidate.id ? 'Selected' : 'Select'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            variant="default"
            className="w-full"
            onClick={handleVote}
            disabled={!selectedCandidate || !isElectionActive || isVoting}
          >
            {isVoting ? 'Casting Vote...' : 'Cast Vote'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 