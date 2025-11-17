import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, BarChart3, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Progress } from "@/components/ui/progress";

interface PollsProps {
  eventId: number;
}

export default function Polls({ eventId }: PollsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const { data: polls = [], isLoading, error } = useQuery({
    queryKey: [`/api/events/${eventId}/polls`],
  });

  // Debug logging
  console.log('[Polls] Component mounted with eventId:', eventId);
  console.log('[Polls] Loading:', isLoading, 'Error:', error, 'Polls count:', polls?.length);

  const createPollMutation = useMutation({
    mutationFn: async (pollData: any) => {
      const response = await apiRequest("POST", `/api/events/${eventId}/polls`, pollData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/polls`] });
      toast({
        title: "Poll created!",
        description: "Your poll is now live for voting.",
      });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create poll. Please try again.",
        variant: "destructive",
      });
    },
  });

  const voteMutation = useMutation({
    mutationFn: async ({ pollId, optionIndex }: { pollId: number; optionIndex: number }) => {
      const response = await apiRequest("POST", `/api/polls/${pollId}/vote`, { optionIndex });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/polls`] });
      toast({
        title: "Vote recorded!",
        description: "Your vote has been counted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to record vote. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setQuestion("");
    setOptions(["", ""]);
  };

  const addOption = () => {
    if (options.length < 5) {
      setOptions([...options, ""]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to create polls.",
        variant: "destructive",
      });
      return;
    }

    if (!question.trim()) {
      toast({
        title: "Missing question",
        description: "Please provide a poll question.",
        variant: "destructive",
      });
      return;
    }

    const validOptions = options.filter(option => option.trim());
    if (validOptions.length < 2) {
      toast({
        title: "Need more options",
        description: "Please provide at least 2 options.",
        variant: "destructive",
      });
      return;
    }

    createPollMutation.mutate({
      question,
      options: validOptions,
    });
  };

  const handleVote = (pollId: number, optionIndex: number) => {
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to vote.",
        variant: "destructive",
      });
      return;
    }
    voteMutation.mutate({ pollId, optionIndex });
  };

  const getUserVote = (poll: any) => {
    if (!user) return null;
    return poll.votes?.find((vote: any) => vote.userId === user.id);
  };

  const getOptionVoteCount = (poll: any, optionIndex: number) => {
    return poll.votes?.filter((vote: any) => vote.optionIndex === optionIndex).length || 0;
  };

  const getTotalVotes = (poll: any) => {
    return poll.votes?.length || 0;
  };

  const getVotePercentage = (poll: any, optionIndex: number) => {
    const totalVotes = getTotalVotes(poll);
    if (totalVotes === 0) return 0;
    return (getOptionVoteCount(poll, optionIndex) / totalVotes) * 100;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8 text-red-400">
        <p>Error loading polls: {error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-white">Polls {polls.length > 0 && `(${polls.length})`}</h3>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gaming-button">
              <Plus className="h-4 w-4 mr-2" />
              Create Poll
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-effect max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Poll</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="question">Question</Label>
                <Input
                  id="question"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="What games should we play?"
                  className="bg-dark-card border-dark-border text-white placeholder:text-gray-400"
                />
              </div>
              
              <div>
                <Label>Options</Label>
                <div className="space-y-2">
                  {options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        className="bg-dark-card border-dark-border flex-1 text-white placeholder:text-gray-400"
                      />
                      {options.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeOption(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {options.length < 5 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addOption}
                      className="w-full border-primary/30"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Option
                    </Button>
                  )}
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full gaming-button"
                disabled={createPollMutation.isPending}
              >
                {createPollMutation.isPending ? "Creating..." : "Create Poll"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {polls.map((poll: any) => (
          <Card key={poll.id} className="glass-effect">
            <CardContent className="p-4">
              <div className="mb-4">
                <h4 className="font-medium mb-2">{poll.question}</h4>
                <p className="text-xs text-muted-foreground">
                  {getTotalVotes(poll)} vote{getTotalVotes(poll) !== 1 ? 's' : ''}
                </p>
              </div>
              
              <div className="space-y-3">
                {poll.options.map((option: string, index: number) => {
                  const voteCount = getOptionVoteCount(poll, index);
                  const percentage = getVotePercentage(poll, index);
                  const userVote = getUserVote(poll);
                  const hasVoted = userVote?.optionIndex === index;
                  const userHasVoted = !!userVote;
                  
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{option}</span>
                        <span className="text-sm text-muted-foreground">
                          {voteCount} vote{voteCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="relative">
                          <Progress value={percentage} className="h-2" />
                          {hasVoted && (
                            <div className="absolute inset-0 bg-primary/30 rounded-full" />
                          )}
                        </div>
                        {userHasVoted && (
                          <Button
                            onClick={() => handleVote(poll.id, index)}
                            disabled={voteMutation.isPending}
                            variant="ghost"
                            size="sm"
                            className={`w-full h-7 text-xs ${hasVoted ? 'text-primary' : 'text-muted-foreground hover:text-white'}`}
                          >
                            {hasVoted ? '✓ Your vote' : 'Change to this'}
                          </Button>
                        )}
                        {!userHasVoted && (
                          <Button
                            onClick={() => handleVote(poll.id, index)}
                            disabled={voteMutation.isPending}
                            variant="outline"
                            size="sm"
                            className="w-full border-primary/30 hover:border-primary hover:bg-primary/10"
                          >
                            Vote for {option}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}

        {polls.length === 0 && (
          <div className="text-center py-12 text-white/60 bg-white/5 rounded-lg border border-white/10">
            <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-semibold mb-2">No polls yet</p>
            <p className="text-sm">Create a poll to get group input on decisions</p>
            {user && (
              <Button 
                onClick={() => setIsCreateDialogOpen(true)}
                className="mt-4 gaming-button"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Poll
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
