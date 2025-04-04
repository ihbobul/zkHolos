import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertCircle } from 'lucide-react';
import { validateElectionTiming } from '../lib/utils';
import { electionService } from '../services/ElectionService';

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      // Validate timing
      const startTime = new Date(formData.startTime).getTime();
      const endTime = new Date(formData.endTime).getTime();
      
      if (!validateElectionTiming(Math.floor(startTime / 1000), Math.floor(endTime / 1000))) {
        throw new Error('Invalid election timing. Start time must be in the future and end time must be at least 1 hour after start time.');
      }

      // Filter out empty regions
      const regions = formData.regions.filter(region => region.trim() !== '');
      if (regions.length === 0) {
        throw new Error('At least one region is required');
      }

      // Validate candidates
      if (formData.candidates.some(c => !c.name.trim() || !c.description.trim())) {
        throw new Error('All candidates must have a name and description');
      }

      // Create election using the service
      await electionService.createElection({
        title: formData.title,
        description: formData.description,
        startTime,
        endTime,
        regions,
        candidates: formData.candidates.map((candidate, index) => ({
          id: index + 1,
          name: candidate.name,
          description: candidate.description,
          voteCount: 0,
          isActive: true
        })),
        ipfsHash: '' // This will be handled by the service
      });

      // Reset form
      setFormData({
        title: '',
        description: '',
        startTime: '',
        endTime: '',
        regions: [''],
        candidates: [{ name: '', description: '' }]
      });

      if (onSuccess) {
        onSuccess(0); // Just pass 0 since we don't need the exact ID
      }
    } catch (err) {
      console.error('Error creating election:', err);
      setError(err instanceof Error ? err.message : 'Failed to create election');
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

  return (
    <div className="max-w-4xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Create New Election</CardTitle>
          <CardDescription>Fill in the details to create a new election.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
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