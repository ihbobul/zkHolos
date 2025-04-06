import { useQuery } from '@tanstack/react-query';
import { electionService, Election } from '@/services/ElectionService';
import { useAuthStore } from '@/stores/authStore';
import { VotingForm } from './VotingForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

export function ElectionList() {
  const { isVoter, voterInfo } = useAuthStore();

  const { data: elections = [], isLoading, error, refetch } = useQuery({
    queryKey: ['elections'],
    queryFn: async () => {
      try {
        return await electionService.getElections();
      } catch (error) {
        console.error('Error fetching elections:', error);
        throw new Error('Failed to load elections');
      }
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="ml-2">Loading elections...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error instanceof Error ? error.message : 'Failed to load elections'}
        </AlertDescription>
      </Alert>
    );
  }

  if (!elections?.length) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <p>No elections found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      {elections.map((election) => (
        <Card key={election.id}>
          <CardHeader>
            <CardTitle>{election.title}</CardTitle>
            <CardDescription>{election.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm">
                Status: {election.isActive ? 'Active' : election.isCompleted ? 'Completed' : 'Not Started'}
              </p>
              <p className="text-sm">
                Start: {new Date(election.startTime).toLocaleString()}
              </p>
              <p className="text-sm">
                End: {new Date(election.endTime).toLocaleString()}
              </p>
              <p className="text-sm">
                Total Votes: {election.totalVotes}
              </p>
              {isVoter && election.isActive && (
                <div className="mt-4">
                  {voterInfo?.isEligible ? (
                    <VotingForm
                      electionId={election.id}
                      candidates={election.candidates}
                      onSuccess={() => refetch()}
                    />
                  ) : (
                    <Alert>
                      <AlertDescription>
                        You are not eligible to vote in this election.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 