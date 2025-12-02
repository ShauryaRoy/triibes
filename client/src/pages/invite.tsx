import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Loader2, Users, CheckCircle, XCircle, Lock } from "lucide-react";
import { LoginDialog } from "@/components/LoginDialog";

export default function InvitePage() {
  const { code } = useParams<{ code: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [status, setStatus] = useState<"loading" | "valid" | "invalid" | "success" | "error">("loading");
  const [groupInfo, setGroupInfo] = useState<{ name: string; description?: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isJoining, setIsJoining] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  // Validate the invite code on mount
  useEffect(() => {
    const validateCode = async () => {
      if (!code) {
        setStatus("invalid");
        setErrorMessage("No invite code provided");
        return;
      }

      try {
        const response = await fetch(`/api/invite/${code}`, { credentials: "include" });
        if (!response.ok) {
          const error = await response.json();
          setStatus("invalid");
          setErrorMessage(error.message || "Invalid invite code");
          return;
        }

        const data = await response.json();
        setGroupInfo({ name: data.group.name, description: data.group.description });
        setStatus("valid");
      } catch (error) {
        setStatus("invalid");
        setErrorMessage("Failed to validate invite code");
      }
    };

    if (!authLoading) {
      validateCode();
    }
  }, [code, authLoading]);

  const handleJoin = async () => {
    if (!user) {
      // Store the current URL for redirect after login
      sessionStorage.setItem('redirectAfterLogin', `/invite/${code}`);
      setShowLoginDialog(true);
      return;
    }

    setIsJoining(true);
    try {
      const response = await apiRequest("POST", "/api/groups/join-by-code", { code });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to join group");
      }

      setStatus("success");
      toast({
        title: "Joined successfully!",
        description: `You're now a member of ${groupInfo?.name || "the group"}`,
      });

      // Redirect to the group page after a short delay
      setTimeout(() => {
        setLocation(`/groups/${data.groupId}`);
      }, 1500);
    } catch (error: any) {
      setStatus("error");
      setErrorMessage(error.message || "Failed to join group");
      toast({
        title: "Failed to join",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  // Show loading while checking auth
  if (authLoading || status === "loading") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto" />
          <p className="text-white/60">Validating invite code...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-900 rounded-xl border border-white/10 p-8 text-center space-y-6">
          {/* Icon */}
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
            status === "success" 
              ? "bg-green-500/20" 
              : status === "invalid" || status === "error"
              ? "bg-red-500/20"
              : "bg-primary/20"
          }`}>
            {status === "success" && <CheckCircle className="h-8 w-8 text-green-400" />}
            {(status === "invalid" || status === "error") && <XCircle className="h-8 w-8 text-red-400" />}
            {status === "valid" && <Users className="h-8 w-8 text-primary" />}
          </div>

          {/* Content based on status */}
          {status === "valid" && (
            <>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-white">You're Invited!</h1>
                <p className="text-white/60">
                  You've been invited to join
                </p>
                <p className="text-xl font-semibold text-white">{groupInfo?.name}</p>
                {groupInfo?.description && (
                  <p className="text-white/50 text-sm mt-2">{groupInfo.description}</p>
                )}
              </div>

              {!user && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-2 text-amber-400 text-sm">
                    <Lock className="h-4 w-4" />
                    <span>Sign in to join this group</span>
                  </div>
                </div>
              )}

              <Button
                onClick={handleJoin}
                disabled={isJoining}
                className="w-full brand-gradient text-lg py-6"
              >
                {isJoining ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : user ? (
                  "Join Group"
                ) : (
                  "Sign In to Join"
                )}
              </Button>
            </>
          )}

          {status === "success" && (
            <div className="space-y-4">
              <h1 className="text-2xl font-bold text-white">Welcome!</h1>
              <p className="text-white/60">
                You've successfully joined <span className="text-white font-medium">{groupInfo?.name}</span>
              </p>
              <p className="text-white/40 text-sm">Redirecting you to the group...</p>
            </div>
          )}

          {(status === "invalid" || status === "error") && (
            <div className="space-y-4">
              <h1 className="text-2xl font-bold text-white">
                {status === "invalid" ? "Invalid Invite" : "Error"}
              </h1>
              <p className="text-white/60">{errorMessage}</p>
              <Button
                variant="outline"
                onClick={() => setLocation("/groups")}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Browse Groups
              </Button>
            </div>
          )}
        </div>

        {/* Back link */}
        <div className="text-center mt-4">
          <button
            onClick={() => setLocation("/")}
            className="text-white/40 hover:text-white/60 text-sm transition-colors"
          >
            ← Back to Home
          </button>
        </div>
      </div>

      {/* Login Dialog */}
      <LoginDialog
        open={showLoginDialog}
        onOpenChange={setShowLoginDialog}
      />
    </div>
  );
}
