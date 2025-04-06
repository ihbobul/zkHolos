import React, { useState, useEffect } from 'react';
import { electionService, VoteData } from '../services/ElectionService';
import { voterService, ZKProof } from '../services/VoterService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ethers } from 'ethers';

const formSchema = z.object({
  candidateId: z.string().min(1, "Please select a candidate"),
});

interface VotingFormProps {
  electionId: number;
  candidates: Array<{ id: number; name: string; description: string }>;
  onSuccess?: () => void;
}

export const VotingForm: React.FC<VotingFormProps> = ({ electionId, candidates, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [voterInfo, setVoterInfo] = useState<{ region: string; isEligible: boolean } | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      candidateId: "",
    },
  });

  useEffect(() => {
    const checkVotingStatus = async () => {
      try {
        const provider = new ethers.JsonRpcProvider('http://localhost:8545');
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        
        // Get voter info first
        const info = await voterService.getVoterInfo(address);
        setVoterInfo(info);

        if (!info.isRegistered) {
          setError('You are not registered as a voter.');
          return;
        }

        if (!info.isEligible) {
          setError('You are not eligible to vote.');
          return;
        }
        
        // Check if user has already voted
        const voted = await electionService.hasVoted(electionId, address);
        setHasVoted(voted);
      } catch (error) {
        console.error('Error checking voting status:', error);
        setError('Failed to check voting status');
      }
    };

    checkVotingStatus();
  }, [electionId]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!voterInfo) {
      setError('Voter information not available');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // In a real application, you would generate this proof using a ZK proving system
      const mockProof: ZKProof = {
        a: ['0x0000000000000000000000000000000000000000000000000000000000000000', '0x0000000000000000000000000000000000000000000000000000000000000000'],
        b: [
          ['0x0000000000000000000000000000000000000000000000000000000000000000', '0x0000000000000000000000000000000000000000000000000000000000000000'],
          ['0x0000000000000000000000000000000000000000000000000000000000000000', '0x0000000000000000000000000000000000000000000000000000000000000000']
        ],
        c: ['0x0000000000000000000000000000000000000000000000000000000000000000', '0x0000000000000000000000000000000000000000000000000000000000000000'],
        input: ['0x0000000000000000000000000000000000000000000000000000000000000000', '0x0000000000000000000000000000000000000000000000000000000000000000']
      };

      const voteData: VoteData = {
        electionId,
        candidateId: parseInt(values.candidateId),
        region: voterInfo.region,
        proof: mockProof
      };

      await electionService.castVote(voteData);
      setHasVoted(true);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error casting vote:', error);
      setError('Failed to cast vote. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!voterInfo?.isEligible) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Not Eligible to Vote</CardTitle>
          <CardDescription>
            You are not eligible to vote in this election.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (hasVoted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vote Cast Successfully</CardTitle>
          <CardDescription>
            You have already voted in this election.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cast Your Vote</CardTitle>
        <CardDescription>
          Select a candidate to vote for
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="candidateId"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Candidates</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      {candidates.map((candidate) => (
                        <FormItem className="flex items-center space-x-3 space-y-0" key={candidate.id}>
                          <FormControl>
                            <RadioGroupItem value={candidate.id.toString()} />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {candidate.name}
                            <p className="text-sm text-muted-foreground">
                              {candidate.description}
                            </p>
                          </FormLabel>
                        </FormItem>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Casting Vote...
                </>
              ) : (
                'Cast Vote'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}; 