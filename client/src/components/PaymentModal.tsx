import { useState, useEffect, useRef } from 'react';
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
  onCapacityError?: (message: string) => void;
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
  onCapacityError,
}: PaymentModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [razorpayKey, setRazorpayKey] = useState<string>('');
  const [isLoadingKey, setIsLoadingKey] = useState(false);
  const [keyError, setKeyError] = useState<string>('');
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const { toast } = useToast();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load Razorpay script once
  useEffect(() => {
    if (scriptLoaded || document.querySelector('script[src*="razorpay"]')) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      console.log('✓ Razorpay script loaded successfully');
      setScriptLoaded(true);
    };
    script.onerror = () => {
      const error = 'Failed to load Razorpay payment gateway script';
      console.error('✗ ' + error);
      setKeyError(error);
      toast({
        title: 'Payment Gateway Error',
        description: error,
        variant: 'destructive',
      });
    };
    document.body.appendChild(script);

      // Cleanup polling interval if component unmounts
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    return () => {
      // Don't remove script - keep it loaded for multiple payment attempts
    };
  }, [scriptLoaded, toast]);

  // Fetch Razorpay key only when modal opens
  useEffect(() => {
    if (!isOpen || razorpayKey || isLoadingKey) {
      return;
    }

    setIsLoadingKey(true);
    setKeyError('');
    console.log('→ Fetching Razorpay key from backend...');

    fetch('/api/payments/razorpay-key', { 
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
      }
    })
      .then(res => {
        console.log('← Backend response:', res.status, res.statusText);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
      .then((data: any) => {
        console.log('← Razorpay key response:', data);
        if (data.key) {
          console.log('✓ Razorpay key loaded:', data.key.substring(0, 10) + '...');
          setRazorpayKey(data.key);
          setKeyError('');
        } else {
          throw new Error('No Razorpay key in response');
        }
      })
      .catch(err => {
        const errorMsg = `Failed to fetch Razorpay key: ${err.message}`;
        console.error('✗ ' + errorMsg);
        setKeyError(errorMsg);
        toast({
          title: 'Payment Gateway Error',
          description: errorMsg,
          variant: 'destructive',
        });
      })
      .finally(() => {
        setIsLoadingKey(false);
      });
  }, [isOpen, razorpayKey, isLoadingKey, toast]);

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
        console.error('❌ Create order failed:', orderResponse.status, error);
        
        // Check if this is a capacity error (403 with eventFull flag OR message contains capacity/full)
        const errorMessage = error.error || 'Failed to create order';
        const isClosedError = error.eventClosed === true || errorMessage.toLowerCase().includes('closed by the host');
        const isCapacityError = error.eventFull === true || 
                               errorMessage.toLowerCase().includes('capacity') || 
                               errorMessage.toLowerCase().includes('full');

        if (isClosedError) {
          onClose();
          toast({
            title: 'Event closed',
            description: 'Event is closed by the host',
            variant: 'destructive',
          });
          return;
        }
        
        if (isCapacityError) {
          // Close payment modal and show capacity dialog
          onClose();
          if (onCapacityError) {
            onCapacityError(errorMessage.replace(/\.$/, ''));
          }
          return;
        }
        
        throw new Error(errorMessage);
      }

      const orderData = await orderResponse.json();
      const { orderId, amount: orderAmount, currency: orderCurrency } = orderData;

      // Open Razorpay checkout
      const options = {
        key: razorpayKey,
        amount: orderAmount,
        currency: orderCurrency,
        name: 'Event Ticket',
        description: 'Ticket purchase',
        order_id: orderId,
        handler: async function (response: any) {
          try {
            console.log('✅ Razorpay payment completed, confirming...');
            
            // Show confirming state
            setIsConfirming(true);
            toast({
              title: 'Payment Successful',
              description: 'Confirming your ticket...',
            });

            // Start polling for payment confirmation
            let pollCount = 0;
            const maxPolls = 15; // 15 polls * 2 seconds = 30 seconds max
            
            const checkPaymentStatus = async (): Promise<boolean> => {
              try {
                const statusResponse = await fetch(`/api/payments/status/${eventId}`, {
                  credentials: 'include',
                });

                if (statusResponse.ok) {
                  const data = await statusResponse.json();
                  
                  // Check if payment is captured
                  if (data.payment && data.payment.status === 'captured') {
                    console.log('✅ Payment confirmed as captured');
                    return true;
                  }
                }
                return false;
              } catch (error) {
                console.warn('⚠️ Error checking payment status:', error);
                return false;
              }
            };

            // Cleanup polling if user dismisses modal
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            
            // Poll immediately once
            const initialCheck = await checkPaymentStatus();
            if (initialCheck) {
              // Clear confirming state
              setIsConfirming(false);
              
              toast({
                title: 'Ticket Confirmed!',
                description: 'Your ticket has been purchased successfully!',
              });

              onPaymentSuccess?.();
              onClose();
              return;
            }

            // Start interval polling
            pollingIntervalRef.current = setInterval(async () => {
              pollCount++;
              console.log(`🔄 Polling payment status (${pollCount}/${maxPolls})...`);

              const isConfirmed = await checkPaymentStatus();

              if (isConfirmed) {
                // Stop polling
                if (pollingIntervalRef.current) {
                  clearInterval(pollingIntervalRef.current);
                  pollingIntervalRef.current = null;
                }
                
                setIsConfirming(false);
                
                toast({
                  title: 'Ticket Confirmed!',
                  description: 'Your ticket has been purchased successfully!',
                });

                onPaymentSuccess?.();
                onClose();
              } else if (pollCount >= maxPolls) {
                // Timeout reached
                if (pollingIntervalRef.current) {
                  clearInterval(pollingIntervalRef.current);
                  pollingIntervalRef.current = null;
                }
                
                setIsConfirming(false);
                
                toast({
                  title: 'Payment Received',
                  description: 'Your payment is being processed. Your ticket will be confirmed shortly. Please refresh in a few moments.',
                  duration: 5000,
                });

                // Still close modal and refresh - user can check status by refreshing
                onClose();
                onPaymentSuccess?.();
              }
            }, 2000); // Poll every 2 seconds

          } catch (error: any) {
            console.error('Payment confirmation error:', error);
            setIsConfirming(false);
            
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            
            toast({
              title: 'Payment Processing',
              description: 'Payment received. Confirmation may take a few moments. Please refresh shortly.',
              variant: 'default',
            });
          }
        },
        prefill: {
          name: '',
          email: '',
        },
        theme: {
          color: '#3b82f6',
        },
      };

      const rzp = new (window as any).Razorpay(options);
      
      rzp.on('payment.failed', async (response) => {
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

          {keyError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive font-medium">Payment Gateway Error</p>
              <p className="text-xs text-destructive/80 mt-1">{keyError}</p>
            </div>
          )}

          {isConfirming && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <p className="text-sm text-blue-800 font-medium">
                  Payment successful! Confirming your ticket...
                </p>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                This usually takes a few seconds.
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handlePayment}
              disabled={isLoading || isLoadingKey || !razorpayKey || !scriptLoaded || isConfirming}
              className="flex-1"
            >
              {isLoadingKey ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : isLoading || isConfirming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Pay Now'
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={onClose} 
              disabled={isLoading || isConfirming}
            >
              Cancel
            </Button>
          </div>

          {!scriptLoaded && !keyError && (
            <p className="text-xs text-muted-foreground text-center">
              Loading payment gateway...
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
