import React, { useEffect, useState } from 'react';
import { electionService, Election, Candidate } from '../services/ElectionService';

interface ElectionDetailsProps {
  electionId: number;
}

export function ElectionDetails({ electionId }: ElectionDetailsProps) {
  const [election, setElection] = useState<Election | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);

  useEffect(() => {
    async function fetchElectionDetails() {
      try {
        setLoading(true);
        const data = await electionService.getElection(electionId);
        if (!data) {
          throw new Error('Election not found');
        }
        setElection(data);
      } catch (err) {
        console.error('Error fetching election details:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch election details');
      } finally {
        setLoading(false);
      }
    }

    fetchElectionDetails();
  }, [electionId]);

  if (loading) {
    return <div>Loading election details...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!election) {
    return <div>Election not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">{election.title}</h2>
        <p className="text-gray-600 mb-6">{election.description}</p>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <h3 className="font-semibold mb-2">Election Status</h3>
            <p>
              {election.isCompleted
                ? 'Completed'
                : election.isActive
                ? 'Active'
                : 'Upcoming'}
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Total Votes</h3>
            <p>{election.totalVotes}</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Start Time</h3>
            <p>{new Date(election.startTime * 1000).toLocaleString()}</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">End Time</h3>
            <p>{new Date(election.endTime * 1000).toLocaleString()}</p>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="font-semibold mb-2">Regions</h3>
          <div className="flex flex-wrap gap-2">
            {election.regions.map((region, index) => (
              <span
                key={index}
                className="bg-gray-100 px-3 py-1 rounded-full text-sm"
              >
                {region}
              </span>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-4">Candidates</h3>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            {election.candidates.map((candidate) => (
              <div
                key={candidate.id}
                className={`p-4 rounded-lg border ${
                  selectedCandidate === candidate.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200'
                } cursor-pointer`}
                onClick={() => setSelectedCandidate(candidate.id)}
              >
                <h4 className="font-semibold mb-2">{candidate.name}</h4>
                <p className="text-gray-600 text-sm mb-2">
                  {candidate.description}
                </p>
                <div className="text-sm text-gray-500">
                  Votes: {candidate.voteCount}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 