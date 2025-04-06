import React, { useState, useEffect } from 'react';
import { voterService, ZKProof } from '../services/VoterService';
import { ethers } from 'ethers';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  region: z.string().min(1, "Region is required"),
});

interface VoterRegistrationProps {
  onSuccess?: () => void;
}

export const VoterRegistration: React.FC<VoterRegistrationProps> = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [voterInfo, setVoterInfo] = useState<{ region: string; isEligible: boolean } | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      region: "",
    },
  });

  // Check if user is already registered
  useEffect(() => {
    const checkRegistration = async () => {
      try {
        const provider = new ethers.JsonRpcProvider('http://localhost:8545');
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        
        const registered = await voterService.isRegistered(address);
        setIsRegistered(registered);

        if (registered) {
          const info = await voterService.getVoterInfo(address);
          setVoterInfo({
            region: info.region,
            isEligible: info.isEligible
          });
        }
      } catch (error) {
        console.error('Error checking registration:', error);
        setError('Failed to check registration status');
      }
    };

    checkRegistration();
  }, []);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    setError(null);

    try {
      // In a real application, you would generate this proof using a ZK proving system
      const mockProof: ZKProof = {
        a: ['0x0', '0x0'],
        b: [['0x0', '0x0'], ['0x0', '0x0']],
        c: ['0x0', '0x0'],
        input: ['0x0', '0x0']
      };

      await voterService.registerVoter(values.region, mockProof);
      setIsRegistered(true);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error registering voter:', error);
      setError('Failed to register voter. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isRegistered && voterInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>You are already registered</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">Region: {voterInfo.region}</p>
          <p className="text-sm">
            Status: {voterInfo.isEligible ? 'Eligible to vote' : 'Not eligible to vote'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Register as a Voter</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="region"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Region</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your region" {...field} disabled={loading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : (
                'Register'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}; 