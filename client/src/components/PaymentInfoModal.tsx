import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface PaymentInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventTitle: string;
  ticketPrice: number;
  hostUpiId: string;
  onConfirmPayment: () => void;
}

export function PaymentInfoModal({
  isOpen,
  onClose,
  eventTitle,
  ticketPrice,
  hostUpiId,
  onConfirmPayment,
}: PaymentInfoModalProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copyUpiId = async () => {
    try {
      await navigator.clipboard.writeText(hostUpiId);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "UPI ID copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy the UPI ID manually",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Payment Required</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground">Event</p>
            <p className="font-medium text-lg">{eventTitle}</p>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 rounded-lg p-6 border border-green-200 dark:border-green-800">
            <p className="text-sm text-muted-foreground mb-1">Amount to Pay</p>
            <p className="text-4xl font-bold text-green-600 dark:text-green-400">₹{ticketPrice}</p>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Pay using UPI:</p>
            <div className="flex items-center gap-2 p-4 bg-muted rounded-lg border">
              <code className="flex-1 font-mono text-sm break-all">{hostUpiId}</code>
              <Button
                size="sm"
                variant="ghost"
                onClick={copyUpiId}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              📱 <strong>Steps to Pay:</strong>
            </p>
            <ol className="text-sm text-blue-800 dark:text-blue-200 mt-2 space-y-1 list-decimal list-inside">
              <li>Open your UPI app (PhonePe, GPay, Paytm, etc.)</li>
              <li>Send ₹{ticketPrice} to the UPI ID above</li>
              <li>Click "I Have Paid" button below</li>
            </ol>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={onConfirmPayment}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              I Have Paid ₹{ticketPrice}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            After payment, you'll be marked as "Going" for this event
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
