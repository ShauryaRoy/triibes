import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check, Trash2, Plus, Link, Clock, Users } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface GroupInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: number;
  groupName: string;
}

export function GroupInviteDialog({ open, onOpenChange, groupId, groupName }: GroupInviteDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [expiresInHours, setExpiresInHours] = useState<string>("0"); // 0 = never
  const [maxUses, setMaxUses] = useState<string>("0"); // 0 = unlimited

  // Fetch existing invite codes
  const { data: inviteCodes = [], isLoading } = useQuery({
    queryKey: [`/api/groups/${groupId}/invite-codes`],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${groupId}/invite-codes`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch invite codes");
      return response.json();
    },
    enabled: open,
  });

  // Create invite code mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/groups/${groupId}/invite-codes`, {
        expiresInHours: expiresInHours === "0" ? null : parseInt(expiresInHours),
        maxUses: maxUses === "0" ? null : parseInt(maxUses),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/invite-codes`] });
      toast({ title: "Invite code created!", description: "Share this code with people you want to invite." });
      setExpiresInHours("0");
      setMaxUses("0");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create invite code", variant: "destructive" });
    },
  });

  // Delete invite code mutation
  const deleteMutation = useMutation({
    mutationFn: async (codeId: number) => {
      const response = await apiRequest("DELETE", `/api/groups/${groupId}/invite-codes/${codeId}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/invite-codes`] });
      toast({ title: "Invite code deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete invite code", variant: "destructive" });
    },
  });

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast({ title: "Code copied!", description: `Invite code ${code} copied to clipboard.` });
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      toast({ title: "Copy failed", description: "Please copy the code manually.", variant: "destructive" });
    }
  };

  const copyInviteLink = async (code: string) => {
    try {
      const link = `${window.location.origin}/invite/${code}`;
      await navigator.clipboard.writeText(link);
      setCopiedCode(`link-${code}`);
      toast({ title: "Link copied!", description: "Invite link copied to clipboard." });
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      toast({ title: "Copy failed", description: "Please copy the link manually.", variant: "destructive" });
    }
  };

  const formatExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return "Never";
    const date = new Date(expiresAt);
    if (date < new Date()) return "Expired";
    const diff = date.getTime() - Date.now();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h left`;
    if (hours > 0) return `${hours}h left`;
    return "< 1h left";
  };

  const isCodeValid = (code: any) => {
    if (!code.isActive) return false;
    if (code.expiresAt && new Date(code.expiresAt) < new Date()) return false;
    if (code.maxUses && code.useCount >= code.maxUses) return false;
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-gray-900 border-white/20 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl">Invite Members</DialogTitle>
          <DialogDescription className="text-white/60">
            Create invite codes to let people join <span className="text-white font-medium">{groupName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create new invite code */}
          <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create New Invite Code
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-white/70 text-sm flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Expires After
                </Label>
                <Select value={expiresInHours} onValueChange={setExpiresInHours}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/20">
                    <SelectItem value="0" className="text-white">Never</SelectItem>
                    <SelectItem value="1" className="text-white">1 hour</SelectItem>
                    <SelectItem value="24" className="text-white">24 hours</SelectItem>
                    <SelectItem value="168" className="text-white">7 days</SelectItem>
                    <SelectItem value="720" className="text-white">30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-white/70 text-sm flex items-center gap-1">
                  <Users className="h-3 w-3" /> Max Uses
                </Label>
                <Select value={maxUses} onValueChange={setMaxUses}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/20">
                    <SelectItem value="0" className="text-white">Unlimited</SelectItem>
                    <SelectItem value="1" className="text-white">1 use</SelectItem>
                    <SelectItem value="5" className="text-white">5 uses</SelectItem>
                    <SelectItem value="10" className="text-white">10 uses</SelectItem>
                    <SelectItem value="25" className="text-white">25 uses</SelectItem>
                    <SelectItem value="50" className="text-white">50 uses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="w-full brand-gradient"
            >
              {createMutation.isPending ? "Creating..." : "Generate Invite Code"}
            </Button>
          </div>

          {/* Existing invite codes */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-white/70">Active Invite Codes</h3>
            
            {isLoading ? (
              <div className="text-center py-4 text-white/50">Loading...</div>
            ) : inviteCodes.length === 0 ? (
              <div className="text-center py-4 text-white/50 text-sm">
                No invite codes yet. Create one above.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {inviteCodes.map((code: any) => (
                  <div 
                    key={code.id} 
                    className={`p-3 rounded-lg border ${
                      isCodeValid(code) 
                        ? 'bg-white/5 border-white/10' 
                        : 'bg-red-500/10 border-red-500/20 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <code className="text-lg font-mono font-bold tracking-wider text-cyan-400">
                            {code.code}
                          </code>
                          {!isCodeValid(code) && (
                            <Badge variant="outline" className="text-red-400 border-red-400/50 text-xs">
                              {code.expiresAt && new Date(code.expiresAt) < new Date() ? 'Expired' : 'Maxed'}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-white/50">
                          <span>{formatExpiry(code.expiresAt)}</span>
                          <span>•</span>
                          <span>
                            {code.useCount} / {code.maxUses || '∞'} uses
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyCode(code.code)}
                          className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10"
                          title="Copy code"
                        >
                          {copiedCode === code.code ? (
                            <Check className="h-4 w-4 text-green-400" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyInviteLink(code.code)}
                          className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10"
                          title="Copy invite link"
                        >
                          {copiedCode === `link-${code.code}` ? (
                            <Check className="h-4 w-4 text-green-400" />
                          ) : (
                            <Link className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(code.id)}
                          disabled={deleteMutation.isPending}
                          className="h-8 w-8 p-0 text-white/60 hover:text-red-400 hover:bg-red-500/10"
                          title="Delete code"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-200">
            <p className="font-medium mb-1">How to invite:</p>
            <ul className="list-disc list-inside text-blue-200/80 space-y-1">
              <li>Share the <strong>code</strong> - users enter it in "Join with Code"</li>
              <li>Share the <strong>link</strong> - users click and join directly</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
