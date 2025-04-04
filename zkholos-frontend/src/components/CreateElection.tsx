import React, { useState } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { uploadToIPFS, pinToIPFS, IPFSElectionData } from '../utils/ipfs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertCircle } from 'lucide-react';
import { validateElectionTiming } from '../lib/utils';

interface CreateElectionProps {
  onSuccess?: (electionId: number) => void;
}

interface FormData {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  regions: string[];
  candidates: {
    name: string;
    description: string;
  }[];
}

export function CreateElection({ onSuccess }: CreateElectionProps) {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    regions: [''],
    candidates: [{ name: '', description: '' }]
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signedContracts, isConnected, connect, isLoading: web3Loading, error: web3Error } = useWeb3();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!signedContracts) return;

    try {
      setLoading(true);
      setError(null);

      // Convert times to Unix timestamps
      const startTime = Math.floor(new Date(formData.startTime).getTime() / 1000);
      const endTime = Math.floor(new Date(formData.endTime).getTime() / 1000);

      // Validate timing
      if (!validateElectionTiming(startTime, endTime)) {
        throw new Error('Invalid election timing. Start time must be in the future and end time must be at least 1 hour after start time.');
      }

      // Prepare IPFS data
      const ipfsData: IPFSElectionData = {
        candidates: formData.candidates.map((candidate, index) => ({
          id: index + 1,
          name: candidate.name,
          description: candidate.description,
          voteCount: 0,
          isActive: true
        })),
        additionalDetails: {
          organizerInfo: 'Created via zkHolos platform',
          rules: 'One vote per registered voter',
          requirements: 'Must be a registered voter'
        }
      };

      // Upload to IPFS
      const ipfsHash = await uploadToIPFS(ipfsData);
      
      // Pin the content to ensure persistence
      await pinToIPFS(ipfsHash);

      // Create election on-chain
      const tx = await signedContracts.electionManager.createElection(
        formData.title,
        formData.description,
        startTime,
        endTime,
        formData.regions.filter(region => region.trim() !== ''),
        ipfsData.candidates,
        ipfsHash
      );

      const receipt = await tx.wait();
      
      // Find the election ID from the event logs
      const event = receipt.events?.find(e => e.event === 'ElectionCreated');
      const electionId = event?.args?.electionId;

      if (electionId && onSuccess) {
        onSuccess(electionId.toNumber());
      }

      // Reset form
      setFormData({
        title: '',
        description: '',
        startTime: '',
        endTime: '',
        regions: [''],
        candidates: [{ name: '', description: '' }]
      });
    } catch (error: any) {
      console.error('Error creating election:', error);
      setError(error.message || 'Failed to create election');
    } finally {
      setLoading(false);
    }
  };

  const addCandidate = () => {
    setFormData(prev => ({
      ...prev,
      candidates: [...prev.candidates, { name: '', description: '' }]
    }));
  };

  const removeCandidate = (index: number) => {
    setFormData(prev => ({
      ...prev,
      candidates: prev.candidates.filter((_, i) => i !== index)
    }));
  };

  const addRegion = () => {
    setFormData(prev => ({
      ...prev,
      regions: [...prev.regions, '']
    }));
  };

  const removeRegion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      regions: prev.regions.filter((_, i) => i !== index)
    }));
  };

  const updateCandidate = (index: number, field: keyof typeof formData.candidates[0], value: string) => {
    setFormData(prev => ({
      ...prev,
      candidates: prev.candidates.map((candidate, i) => 
        i === index ? { ...candidate, [field]: value } : candidate
      )
    }));
  };

  const updateRegion = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      regions: prev.regions.map((region, i) => i === index ? value : region)
    }));
  };

  if (!isConnected) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
        <p className="mb-4">Please connect your wallet to create an election.</p>
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

  return (
    <div className="max-w-4xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Create New Election</CardTitle>
          <CardDescription>Fill in the details to create a new election.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {(error || web3Error) && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error || web3Error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label className="block font-medium">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full p-2 border rounded"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block font-medium">Description</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full p-2 border rounded"
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block font-medium">Start Time</label>
                <input
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={e => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block font-medium">End Time</label>
                <input
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={e => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block font-medium">Regions</label>
              {formData.regions.map((region, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={region}
                    onChange={e => updateRegion(index, e.target.value)}
                    className="flex-1 p-2 border rounded"
                    placeholder="Enter region name"
                    required
                  />
                  {formData.regions.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => removeRegion(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={addRegion}
                className="mt-2"
              >
                Add Region
              </Button>
            </div>

            <div className="space-y-2">
              <label className="block font-medium">Candidates</label>
              {formData.candidates.map((candidate, index) => (
                <div key={index} className="space-y-2 p-4 border rounded">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Candidate {index + 1}</h4>
                    {formData.candidates.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => removeCandidate(index)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={candidate.name}
                    onChange={e => updateCandidate(index, 'name', e.target.value)}
                    className="w-full p-2 border rounded"
                    placeholder="Candidate name"
                    required
                  />
                  <textarea
                    value={candidate.description}
                    onChange={e => updateCandidate(index, 'description', e.target.value)}
                    className="w-full p-2 border rounded"
                    placeholder="Candidate description"
                    rows={2}
                    required
                  />
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={addCandidate}
                className="mt-2"
              >
                Add Candidate
              </Button>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Creating Election...' : 'Create Election'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
} 