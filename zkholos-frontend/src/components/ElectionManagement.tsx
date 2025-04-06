import React, { useState } from 'react';
import { electionService } from '../services/ElectionService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from 'react-router-dom';

const candidateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
});

const createElectionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  region: z.string().min(1, "Region is required"),
  candidates: z.array(candidateSchema).min(1, "At least one candidate is required"),
});

const addCandidateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
});

type FormValues = z.infer<typeof createElectionSchema>;
type AddCandidateValues = z.infer<typeof addCandidateSchema>;

export function ElectionManagement() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [selectedElectionId, setSelectedElectionId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("list");
  const [showAddCandidate, setShowAddCandidate] = useState(false);

  const { data: elections = [], isLoading, error: electionsError } = useQuery({
    queryKey: ['elections'],
    queryFn: () => electionService.getElections(),
  });

  const selectedElection = elections.find(e => e.id === selectedElectionId) || elections[0];

  const form = useForm<FormValues>({
    resolver: zodResolver(createElectionSchema),
    defaultValues: {
      title: "",
      description: "",
      startTime: "",
      endTime: "",
      region: "",
      candidates: [{ name: "", description: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "candidates",
  });

  const addCandidateForm = useForm<AddCandidateValues>({
    resolver: zodResolver(addCandidateSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const createElectionMutation = useMutation({
    mutationFn: (data: FormValues) => {
      const startTime = new Date(data.startTime).getTime();
      const endTime = new Date(data.endTime).getTime();
      return electionService.createElection({
        title: data.title,
        description: data.description,
        startTime,
        endTime,
        regions: [data.region],
        candidates: data.candidates.map((candidate, index) => ({
          id: index + 1,
          name: candidate.name,
          description: candidate.description,
          voteCount: 0,
          isActive: true,
        })),
        ipfsHash: "",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elections'] });
      form.reset();
      setActiveTab("list");
      setError(null);
    },
    onError: (error) => {
      console.error('Error creating election:', error);
      setError('Failed to create election. Please try again.');
    },
  });

  const startElectionMutation = useMutation({
    mutationFn: (id: number) => electionService.startElection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elections'] });
      setError(null);
    },
  });

  const pauseElectionMutation = useMutation({
    mutationFn: (id: number) => electionService.pauseElection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elections'] });
      setError(null);
    },
  });

  const resumeElectionMutation = useMutation({
    mutationFn: (id: number) => electionService.resumeElection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elections'] });
      setError(null);
    },
  });

  const endElectionMutation = useMutation({
    mutationFn: (id: number) => electionService.endElection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elections'] });
      setError(null);
    },
  });

  const addCandidateMutation = useMutation({
    mutationFn: async (data: AddCandidateValues) => {
      if (!selectedElection) throw new Error('No election selected');
      await electionService.addCandidate(selectedElection.id, data.name, data.description);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elections'] });
      addCandidateForm.reset();
      setShowAddCandidate(false);
      setError(null);
    },
  });

  const updateCandidateStatusMutation = useMutation({
    mutationFn: async ({ candidateId, isActive }: { candidateId: number; isActive: boolean }) => {
      if (!selectedElection) throw new Error('No election selected');
      await electionService.updateCandidateStatus(selectedElection.id, candidateId, isActive);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elections'] });
      setError(null);
    },
  });

  const handleCreateElection = async (values: FormValues) => {
    try {
      await createElectionMutation.mutateAsync(values);
    } catch (error) {
      console.error('Error creating election:', error);
      setError('Failed to create election');
    }
  };

  const handleStartElection = async () => {
    if (!selectedElection) return;
    try {
      await startElectionMutation.mutateAsync(selectedElection.id);
    } catch (error) {
      console.error('Error starting election:', error);
      setError('Failed to start election');
    }
  };

  const handlePauseElection = async () => {
    if (!selectedElection) return;
    try {
      await pauseElectionMutation.mutateAsync(selectedElection.id);
    } catch (error) {
      console.error('Error pausing election:', error);
      setError('Failed to pause election');
    }
  };

  const handleResumeElection = async () => {
    if (!selectedElection) return;
    try {
      await resumeElectionMutation.mutateAsync(selectedElection.id);
    } catch (error) {
      console.error('Error resuming election:', error);
      setError('Failed to resume election');
    }
  };

  const handleEndElection = async () => {
    if (!selectedElection) return;
    try {
      await endElectionMutation.mutateAsync(selectedElection.id);
    } catch (error) {
      console.error('Error ending election:', error);
      setError('Failed to end election');
    }
  };

  const handleAddCandidate = async (values: AddCandidateValues) => {
    try {
      await addCandidateMutation.mutateAsync(values);
    } catch (error) {
      console.error('Error adding candidate:', error);
      setError('Failed to add candidate');
    }
  };

  const handleUpdateCandidateStatus = async (candidateId: number, isActive: boolean) => {
    try {
      await updateCandidateStatusMutation.mutateAsync({ candidateId, isActive });
    } catch (error) {
      console.error('Error updating candidate status:', error);
      setError('Failed to update candidate status');
    }
  };

  const handleVote = () => {
    if (selectedElection) {
      navigate(`/vote/${selectedElection.id}`);
    }
  };

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

  if (electionsError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Failed to load elections</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Election Management</CardTitle>
          <CardDescription>
            Manage election settings and candidates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="list">Elections</TabsTrigger>
              <TabsTrigger value="create">Create Election</TabsTrigger>
            </TabsList>

            <TabsContent value="list">
              {elections.length > 0 ? (
                <>
                  {elections.length > 1 && (
                    <div className="mb-6">
                      <div className="space-y-2">
                        <Label>Select Election</Label>
                        <Select
                          value={selectedElectionId?.toString()}
                          onValueChange={(value) => setSelectedElectionId(Number(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select an election" />
                          </SelectTrigger>
                          <SelectContent>
                            {elections.map((election) => (
                              <SelectItem key={election.id} value={election.id.toString()}>
                                {election.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {error && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Card>
                    <CardHeader>
                      <CardTitle>Election Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedElection && (
                        <>
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="text-sm font-medium">Election Status</h4>
                              <p className="text-sm text-muted-foreground">
                                {selectedElection.isCompleted
                                  ? 'Completed'
                                  : selectedElection.isActive
                                  ? 'Active'
                                  : 'Not Started'}
                              </p>
                            </div>
                            <div className="space-x-2">
                              {!selectedElection.isActive && !selectedElection.isCompleted && (
                                <Button 
                                  onClick={handleStartElection} 
                                  disabled={startElectionMutation.isPending}
                                >
                                  {startElectionMutation.isPending ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Starting...
                                    </>
                                  ) : (
                                    'Start Election'
                                  )}
                                </Button>
                              )}
                              {selectedElection.isActive && !selectedElection.isCompleted && (
                                <>
                                  <Button 
                                    onClick={handlePauseElection}
                                    variant="outline"
                                    disabled={pauseElectionMutation.isPending}
                                  >
                                    {pauseElectionMutation.isPending ? 'Pausing...' : 'Pause'}
                                  </Button>
                                  <Button 
                                    onClick={handleEndElection}
                                    variant="destructive"
                                    disabled={endElectionMutation.isPending}
                                  >
                                    {endElectionMutation.isPending ? 'Ending...' : 'End Election'}
                                  </Button>
                                </>
                              )}
                              {!selectedElection.isActive && !selectedElection.isCompleted && (
                                <Button 
                                  onClick={handleResumeElection}
                                  disabled={resumeElectionMutation.isPending}
                                >
                                  {resumeElectionMutation.isPending ? 'Resuming...' : 'Resume'}
                                </Button>
                              )}
                              <Button
                                onClick={handleVote}
                                variant="secondary"
                              >
                                Vote
                              </Button>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-4">
                              <h4 className="text-sm font-medium">Candidates</h4>
                              {!selectedElection.isCompleted && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowAddCandidate(true)}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Candidate
                                </Button>
                              )}
                            </div>

                            {showAddCandidate && (
                              <Card className="mb-4">
                                <CardContent className="pt-6">
                                  <Form {...addCandidateForm}>
                                    <form onSubmit={addCandidateForm.handleSubmit(handleAddCandidate)} className="space-y-4">
                                      <FormField
                                        control={addCandidateForm.control}
                                        name="name"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>Name</FormLabel>
                                            <FormControl>
                                              <Input placeholder="Candidate name" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />

                                      <FormField
                                        control={addCandidateForm.control}
                                        name="description"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>Description</FormLabel>
                                            <FormControl>
                                              <Textarea 
                                                placeholder="Candidate description" 
                                                {...field} 
                                              />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />

                                      <div className="flex justify-end space-x-2">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          onClick={() => setShowAddCandidate(false)}
                                        >
                                          Cancel
                                        </Button>
                                        <Button 
                                          type="submit"
                                          disabled={addCandidateMutation.isPending}
                                        >
                                          {addCandidateMutation.isPending ? (
                                            <>
                                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                              Adding...
                                            </>
                                          ) : (
                                            'Add Candidate'
                                          )}
                                        </Button>
                                      </div>
                                    </form>
                                  </Form>
                                </CardContent>
                              </Card>
                            )}

                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Name</TableHead>
                                  <TableHead>Description</TableHead>
                                  <TableHead>Status</TableHead>
                                  {!selectedElection.isCompleted && (
                                    <TableHead>Actions</TableHead>
                                  )}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {selectedElection.candidates.map((candidate) => (
                                  <TableRow key={candidate.id}>
                                    <TableCell>{candidate.name}</TableCell>
                                    <TableCell>{candidate.description}</TableCell>
                                    <TableCell>{candidate.isActive ? 'Active' : 'Inactive'}</TableCell>
                                    {!selectedElection.isCompleted && (
                                      <TableCell>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleUpdateCandidateStatus(candidate.id, !candidate.isActive)}
                                          disabled={updateCandidateStatusMutation.isPending}
                                        >
                                          {candidate.isActive ? 'Deactivate' : 'Activate'}
                                        </Button>
                                      </TableCell>
                                    )}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Alert>
                  <AlertDescription>No elections available. Create your first election!</AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="create">
              <Card>
                <CardHeader>
                  <CardTitle>Create New Election</CardTitle>
                  <CardDescription>Fill in the details to create a new election.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleCreateElection)} className="space-y-6">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                              <Input placeholder="Election title" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Election description" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="startTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Start Time</FormLabel>
                              <FormControl>
                                <Input type="datetime-local" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="endTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>End Time</FormLabel>
                              <FormControl>
                                <Input type="datetime-local" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="region"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Region</FormLabel>
                            <FormControl>
                              <Input placeholder="Region name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="space-y-4">
                        <Label>Candidates</Label>
                        {fields.map((field, index) => (
                          <div key={field.id} className="flex gap-4 items-start">
                            <FormField
                              control={form.control}
                              name={`candidates.${index}.name`}
                              render={({ field }) => (
                                <FormItem className="flex-1">
                                  <FormLabel>Name</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`candidates.${index}.description`}
                              render={({ field }) => (
                                <FormItem className="flex-1">
                                  <FormLabel>Description</FormLabel>
                                  <FormControl>
                                    <Textarea {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="mt-8"
                              onClick={() => remove(index)}
                              disabled={index === 0 && fields.length === 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => append({ name: "", description: "" })}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Candidate
                        </Button>
                      </div>

                      {error && (
                        <Alert variant="destructive">
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      )}

                      <Button type="submit" disabled={createElectionMutation.isPending}>
                        {createElectionMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Create Election
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 