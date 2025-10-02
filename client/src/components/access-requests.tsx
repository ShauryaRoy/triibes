import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, X, UserCheck, Clock } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AccessRequestsProps {
  eventId: number;
  accessRequests: any[];
  isHost: boolean;
}

export default function AccessRequests({ eventId, accessRequests, isHost }: AccessRequestsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const respondToRequestMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: 'approve' | 'deny' }) => {
      const res = await apiRequest("POST", `/api/events/${eventId}/access-requests/respond`, {
        userId,
        action
      });
      if (!res.ok) throw new Error("Failed to respond to access request");
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}`] });
      toast({
        title: variables.action === 'approve' ? "Access Approved" : "Access Denied",
        description: variables.action === 'approve' 
          ? "The user can now view the full event details" 
          : "The access request has been declined",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to respond to access request",
        variant: "destructive",
      });
    },
  });

  const handleApprove = (userId: string) => {
    respondToRequestMutation.mutate({ userId, action: 'approve' });
  };

  const handleDeny = (userId: string) => {
    respondToRequestMutation.mutate({ userId, action: 'deny' });
  };

  // Only show to host and if there are access requests
  if (!isHost || accessRequests.length === 0) {
    return null;
  }

  return (
    <Card className="glass-effect border-orange-500/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-orange-400">
            <UserCheck className="h-5 w-5" />
            Access Requests
          </CardTitle>
          <span className="text-sm text-orange-300">{accessRequests.length} pending</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {accessRequests.map((request) => (
          <div key={request.id} className="flex items-center justify-between p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
            <div className="flex items-center space-x-3">
              <Avatar className="w-9 h-9">
                <AvatarImage src={request.user?.profileImageUrl} />
                <AvatarFallback>
                  {request.user?.firstName?.[0]}{request.user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-white">
                  {request.user?.firstName} {request.user?.lastName}
                </p>
                <p className="text-xs text-orange-300 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Requesting access
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleApprove(request.userId)}
                disabled={respondToRequestMutation.isPending}
                className="bg-green-500/20 border-green-500/40 hover:bg-green-500/30 text-green-300 hover:text-green-200"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDeny(request.userId)}
                disabled={respondToRequestMutation.isPending}
                className="bg-red-500/20 border-red-500/40 hover:bg-red-500/30 text-red-300 hover:text-red-200"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        
        <div className="text-xs text-orange-200/70 bg-orange-500/5 p-2 rounded border border-orange-500/20">
          💡 Only you can see this section. Approve requests to grant access to your private event.
        </div>
      </CardContent>
    </Card>
  );
}