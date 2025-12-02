import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Check, Trash2, Plus, Loader2, Link2, Clock, Users, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface EventInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: number;
  eventSlug?: string;
  eventTitle: string;
}

export function EventInviteDialog({ open, onOpenChange, eventId, eventSlug, eventTitle }: EventInviteDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState<string>("never");
  const [maxUses, setMaxUses] = useState<string>("unlimited");

  const eventIdentifier = eventSlug || eventId;

  // Fetch existing invite codes
  const { data: inviteCodes = [], isLoading } = useQuery({
    queryKey: [`/api/events/${eventIdentifier}/invite-codes`],
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventIdentifier}/invite-codes`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch invite codes");
      return response.json();
    },
    enabled: open,
  });

  // Create new invite code
  const createMutation = useMutation({
    mutationFn: async () => {
      const expiresInHours = expiresIn === "never" ? null : parseInt(expiresIn);
      const maxUsesNum = maxUses === "unlimited" ? null : parseInt(maxUses);
      
      const response = await apiRequest("POST", `/api/events/${eventIdentifier}/invite-codes`, {
        expiresInHours,
        maxUses: maxUsesNum,
      });
      if (!response.ok) throw new Error("Failed to create invite code");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventIdentifier}/invite-codes`] });
      toast({ title: "Invite code created!" });
    },
    onError: () => {
      toast({ title: "Failed to create invite code", variant: "destructive" });
    },
  });

  // Delete invite code
  const deleteMutation = useMutation({
    mutationFn: async (codeId: number) => {
      const response = await apiRequest("DELETE", `/api/events/${eventIdentifier}/invite-codes/${codeId}`);
      if (!response.ok) throw new Error("Failed to delete invite code");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventIdentifier}/invite-codes`] });
      toast({ title: "Invite code deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete invite code", variant: "destructive" });
    },
  });

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast({ title: "Code copied!" });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const copyLink = async (code: string) => {
    const link = `${window.location.origin}/event-invite/${code}`;
    await navigator.clipboard.writeText(link);
    setCopiedCode(`link-${code}`);
    toast({ title: "Invite link copied!" });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const shareLink = async (code: string) => {
    const link = `${window.location.origin}/event-invite/${code}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${eventTitle}`,
          text: `You're invited to ${eventTitle}!`,
          url: link,
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          copyLink(code);
        }
      }
    } else {
      copyLink(code);
    }
  };

  const formatExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return "Never";
    const date = new Date(expiresAt);
    const now = new Date();
    if (date < now) return "Expired";
    
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays}d left`;
    if (diffHours > 0) return `${diffHours}h left`;
    return "< 1h left";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-white/20 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Event Invite Codes
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Create invite codes to share with guests. Anyone with a valid code can join this event.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Create new code section */}
          <div className="bg-white/5 rounded-lg p-4 space-y-3 border border-white/10">
            <h4 className="text-sm font-medium text-white">Create New Code</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/60 block mb-1">Expires In</label>
                <Select value={expiresIn} onValueChange={setExpiresIn}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/20">
                    <SelectItem value="1" className="text-white">1 hour</SelectItem>
                    <SelectItem value="24" className="text-white">24 hours</SelectItem>
                    <SelectItem value="168" className="text-white">7 days</SelectItem>
                    <SelectItem value="720" className="text-white">30 days</SelectItem>
                    <SelectItem value="never" className="text-white">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-white/60 block mb-1">Max Uses</label>
                <Select value={maxUses} onValueChange={setMaxUses}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/20">
                    <SelectItem value="1" className="text-white">1 use</SelectItem>
                    <SelectItem value="5" className="text-white">5 uses</SelectItem>
                    <SelectItem value="10" className="text-white">10 uses</SelectItem>
                    <SelectItem value="25" className="text-white">25 uses</SelectItem>
                    <SelectItem value="50" className="text-white">50 uses</SelectItem>
                    <SelectItem value="unlimited" className="text-white">Unlimited</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button 
              onClick={() => createMutation.mutate()} 
              disabled={createMutation.isPending}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {createMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</>
              ) : (
                <><Plus className="h-4 w-4 mr-2" /> Generate Code</>
              )}
            </Button>
          </div>

          {/* Existing codes */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-white">Active Codes</h4>
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-white/60" />
              </div>
            ) : inviteCodes.length === 0 ? (
              <div className="text-center py-4 text-white/50 text-sm">
                No invite codes yet. Create one above!
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {inviteCodes.map((code: any) => (
                  <div 
                    key={code.id} 
                    className="bg-white/5 rounded-lg p-3 border border-white/10 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <code className="text-lg font-mono font-bold tracking-wider text-white">
                        {code.code}
                      </code>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyCode(code.code)}
                          className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10"
                        >
                          {copiedCode === code.code ? (
                            <Check className="h-4 w-4 text-green-400" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => shareLink(code.code)}
                          className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10"
                        >
                          {copiedCode === `link-${code.code}` ? (
                            <Check className="h-4 w-4 text-green-400" />
                          ) : (
                            <Share2 className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteMutation.mutate(code.id)}
                          className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-white/50">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatExpiry(code.expiresAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {code.useCount}{code.maxUses ? `/${code.maxUses}` : ''} uses
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
