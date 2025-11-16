import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: number;
  eventTitle: string;
  amount: number;
  currency?: string;
  onPaymentSuccess?: () => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function PaymentModal({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  amount,
  currency = 'INR',
  onPaymentSuccess,
}: PaymentModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [razorpayKey, setRazorpayKey] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    // Get Razorpay key
    fetch('/api/payments/razorpay-key', { credentials: 'include' })
      .then(res => res.json())
      .then((data: any) => {
        setRazorpayKey(data.key);
      })
      .catch(err => {
        console.error('Failed to fetch Razorpay key:', err);
      });

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handlePayment = async () => {
    try {
      setIsLoading(true);

      // Create order (convert rupees to paise for Razorpay)
      const orderResponse = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ eventId, amount: amount * 100 }),
      });

      if (!orderResponse.ok) {
        const error = await orderResponse.json();
        throw new Error(error.error || 'Failed to create order');
      }

      const orderData = await orderResponse.json();
      const { orderId, amount: orderAmount, currency: orderCurrency } = orderData;

      // Open Razorpay checkout
      const options = {
        key: razorpayKey,
        amount: orderAmount,
        currency: orderCurrency,
        name: 'Event Ticket',
        description: `Ticket for ${eventTitle}`,
        order_id: orderId,
        handler: async (response: any) => {
          try {
            // Verify payment
            const verifyResponse = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            if (!verifyResponse.ok) {
              const error = await verifyResponse.json();
              throw new Error(error.error || 'Verification failed');
            }

            toast({
              title: 'Payment Successful',
              description: 'Your ticket has been purchased successfully!',
            });

            onPaymentSuccess?.();
            onClose();
          } catch (error: any) {
            console.error('Payment verification failed:', error);
            toast({
              title: 'Payment Verification Failed',
              description: error.message || 'Please contact support',
              variant: 'destructive',
            });
          }
        },
        modal: {
          ondismiss: () => {
            setIsLoading(false);
          },
        },
        theme: {
          color: '#3399cc',
        },
      };

      const rzp = new window.Razorpay(options);
      
      rzp.on('payment.failed', async (response: any) => {
        console.error('Payment failed:', response.error);
        
        // Notify backend of failure
        await fetch('/api/payments/failure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            orderId,
            reason: response.error.description,
          }),
        });

        toast({
          title: 'Payment Failed',
          description: response.error.description || 'Payment failed. Please try again.',
          variant: 'destructive',
        });
        
        setIsLoading(false);
      });

      rzp.open();
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to initiate payment',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent aria-describedby="payment-modal-description">
        <DialogHeader>
          <DialogTitle>Purchase Ticket</DialogTitle>
        </DialogHeader>
        <div id="payment-modal-description" className="sr-only">
          Complete your ticket purchase for {eventTitle}
        </div>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Event</p>
            <p className="font-medium">{eventTitle}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Amount</p>
            <p className="text-2xl font-bold">
              {currency === 'INR' ? '₹' : '$'}
              {amount}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handlePayment}
              disabled={isLoading || !razorpayKey}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Pay Now'
              )}
            </Button>
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
