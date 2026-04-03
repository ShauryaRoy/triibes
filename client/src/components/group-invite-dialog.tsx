import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check, Trash2, Plus, Link as LinkIcon, UserPlus, Clock, Users } from "lucide-react";
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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expiresInHours, setExpiresInHours] = useState<string>("0");
  const [maxUses, setMaxUses] = useState<string>("0");

  const { data: inviteCodes = [], isLoading } = useQuery({
    queryKey: [`/api/groups/${groupId}/invite-codes`],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${groupId}/invite-codes`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch invite codes");
      return response.json();
    },
    enabled: open,
  });

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
      toast({ title: "Invite code created!" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (codeId: number) => {
      const response = await apiRequest("DELETE", `/api/groups/${groupId}/invite-codes/${codeId}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/invite-codes`] });
    },
  });

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({ title: "Copied to clipboard" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-none rounded-[2.5rem] p-8 shadow-2xl">
        <DialogHeader className="mb-6">
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mb-4 mx-auto">
             <UserPlus className="h-6 w-6 text-indigo-600" />
          </div>
          <DialogTitle className="text-2xl font-black text-center text-slate-900 dark:text-white">Invite Tribe</DialogTitle>
          <DialogDescription className="text-center text-slate-500 dark:text-slate-400 font-medium">
             Grow <span className="text-slate-900 dark:text-white font-bold">{groupName}</span> by sharing an invite link.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8">
          {/* Quick Create Link */}
          <div className="grid grid-cols-2 gap-3">
             <div className="space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Expires</p>
                <Select value={expiresInHours} onValueChange={setExpiresInHours}>
                  <SelectTrigger className="h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-xs">
                    <Clock className="h-3.5 w-3.5 mr-2" /><SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-none shadow-xl">
                    <SelectItem value="0">Never</SelectItem>
                    <SelectItem value="24">1 Day</SelectItem>
                    <SelectItem value="168">7 Days</SelectItem>
                  </SelectContent>
                </Select>
             </div>
             <div className="space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Limit</p>
                <Select value={maxUses} onValueChange={setMaxUses}>
                  <SelectTrigger className="h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-xs">
                    <Users className="h-3.5 w-3.5 mr-2" /><SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-none shadow-xl">
                    <SelectItem value="0">Unlimited</SelectItem>
                    <SelectItem value="10">10 Uses</SelectItem>
                    <SelectItem value="50">50 Uses</SelectItem>
                  </SelectContent>
                </Select>
             </div>
          </div>

          <Button 
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="w-full h-12 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-sm shadow-lg hover:scale-[1.02] transition-all"
          >
            {createMutation.isPending ? "Generating..." : "Generate New Link"}
          </Button>

          {/* Active Links List */}
          <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
             {inviteCodes.filter((c: any) => !c.expiresAt || new Date(c.expiresAt) > new Date()).map((code: any) => (
                <div key={code.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                   <div className="min-w-0">
                      <p className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-sm tracking-wider">{code.code}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                         {code.useCount} uses · {code.expiresAt ? new Date(code.expiresAt).toLocaleDateString() : 'Infinite'}
                      </p>
                   </div>
                   <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 rounded-lg hover:bg-white"
                        onClick={() => copyToClipboard(`${window.location.origin}/invite/${code.code}`, `link-${code.id}`)}
                      >
                         {copiedId === `link-${code.id}` ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <LinkIcon className="h-3.5 w-3.5" />}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 rounded-lg hover:bg-red-50 text-red-400"
                        onClick={() => deleteMutation.mutate(code.id)}
                      >
                         <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                   </div>
                </div>
             ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
