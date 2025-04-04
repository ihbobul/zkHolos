import React, { useEffect, useState } from 'react';
import { electionService, Election } from '../services/ElectionService';

interface ElectionListProps {
  onSelectElection: (electionId: number) => void;
}

export function ElectionList({ onSelectElection }: ElectionListProps) {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchElections() {
      try {
        setLoading(true);
        const data = await electionService.getElections();
        setElections(data);
      } catch (err) {
        console.error('Error fetching elections:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch elections');
      } finally {
        setLoading(false);
      }
    }

    fetchElections();
  }, []);

  const handleElectionCreated = async () => {
    // Just refresh the entire list
    const elections = await electionService.getElections();
    setElections(elections);
  };

  if (loading) {
    return <div>Loading elections...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (elections.length === 0) {
    return <div>No elections found.</div>;
  }

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {elections.map((election) => (
        <div
          key={election.id}
          className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => onSelectElection(election.id)}
        >
          <h3 className="text-xl font-semibold mb-2">{election.title}</h3>
          <p className="text-gray-600 mb-4">{election.description}</p>
          <div className="flex justify-between text-sm text-gray-500">
            <span>Total Votes: {election.totalVotes}</span>
            <span>
              Status:{' '}
              {election.isCompleted
                ? 'Completed'
                : election.isActive
                ? 'Active'
                : 'Upcoming'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
} 