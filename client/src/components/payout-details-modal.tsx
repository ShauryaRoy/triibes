import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Wallet } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PayoutDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (details: PayoutDetails) => void;
  initialData?: PayoutDetails;
}

export interface PayoutDetails {
  payoutMethod: "upi" | "bank";
  upiId?: string;
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
}

export function PayoutDetailsModal({ isOpen, onClose, onSave, initialData }: PayoutDetailsModalProps) {
  const [payoutMethod, setPayoutMethod] = useState<"upi" | "bank">(initialData?.payoutMethod || "upi");
  const [upiId, setUpiId] = useState(initialData?.upiId || "");
  const [accountHolderName, setAccountHolderName] = useState(initialData?.accountHolderName || "");
  const [accountNumber, setAccountNumber] = useState(initialData?.accountNumber || "");
  const [ifscCode, setIfscCode] = useState(initialData?.ifscCode || "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const validateUpiId = (upi: string) => {
    const upiRegex = /^[\w.-]+@[\w.-]+$/;
    return upiRegex.test(upi);
  };

  const validateIFSC = (ifsc: string) => {
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    return ifscRegex.test(ifsc.toUpperCase());
  };

  const handleSave = () => {
    const newErrors: Record<string, string> = {};

    if (payoutMethod === "upi") {
      if (!upiId.trim()) {
        newErrors.upiId = "UPI ID is required";
      } else if (!validateUpiId(upiId)) {
        newErrors.upiId = "Invalid UPI ID format (e.g., yourname@upi)";
      }
    } else {
      if (!accountHolderName.trim()) {
        newErrors.accountHolderName = "Account holder name is required";
      }
      if (!accountNumber.trim()) {
        newErrors.accountNumber = "Account number is required";
      } else if (!/^\d{9,18}$/.test(accountNumber)) {
        newErrors.accountNumber = "Invalid account number";
      }
      if (!ifscCode.trim()) {
        newErrors.ifscCode = "IFSC code is required";
      } else if (!validateIFSC(ifscCode)) {
        newErrors.ifscCode = "Invalid IFSC code format";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const details: PayoutDetails = {
      payoutMethod,
      ...(payoutMethod === "upi" ? { upiId } : {
        accountHolderName,
        accountNumber,
        ifscCode: ifscCode.toUpperCase()
      })
    };

    onSave(details);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose} 
      />
      
      <div className="relative w-full max-w-lg border border-white/10 bg-[#0f1012]/95 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-white/10 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-white/90 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-emerald-400" />
              Payout Details
            </h2>
            <button
              onClick={onClose}
              className="text-white/50 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="max-h-[60vh]">
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Where should we send your earnings?
              </h3>
              <p className="text-white/60 text-sm">
                We'll collect payments for this event and transfer your earnings after the event ends.
              </p>
            </div>

            {/* Payout Method Selection */}
            <div className="space-y-3">
              <Label className="text-white text-sm font-medium">Payout Method *</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPayoutMethod("upi");
                    setErrors({});
                  }}
                  className={`p-4 rounded-xl border text-center transition ${
                    payoutMethod === "upi"
                      ? "border-emerald-400/60 bg-emerald-400/10 text-white"
                      : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                  }`}
                >
                  <div className="text-sm font-medium">UPI ID</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPayoutMethod("bank");
                    setErrors({});
                  }}
                  className={`p-4 rounded-xl border text-center transition ${
                    payoutMethod === "bank"
                      ? "border-emerald-400/60 bg-emerald-400/10 text-white"
                      : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                  }`}
                >
                  <div className="text-sm font-medium">Bank Account</div>
                </button>
              </div>
            </div>

            {/* UPI Form */}
            {payoutMethod === "upi" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-1">
                <div className="space-y-2">
                  <Label htmlFor="upiId" className="text-white text-sm font-medium">
                    UPI ID *
                  </Label>
                  <Input
                    id="upiId"
                    type="text"
                    value={upiId}
                    onChange={(e) => {
                      setUpiId(e.target.value);
                      if (errors.upiId) setErrors({ ...errors, upiId: "" });
                    }}
                    placeholder="yourname@upi"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-emerald-400/30 focus-visible:border-emerald-400/50"
                  />
                  {errors.upiId && (
                    <p className="text-red-400 text-xs mt-1">{errors.upiId}</p>
                  )}
                  <p className="text-white/50 text-xs mt-2 italic">
                    ✨ Fastest way to receive payouts
                  </p>
                </div>
              </div>
            )}

            {/* Bank Account Form */}
            {payoutMethod === "bank" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-1">
                <div className="space-y-2">
                  <Label htmlFor="accountHolderName" className="text-white text-sm font-medium">
                    Account Holder Name *
                  </Label>
                  <Input
                    id="accountHolderName"
                    type="text"
                    value={accountHolderName}
                    onChange={(e) => {
                      setAccountHolderName(e.target.value);
                      if (errors.accountHolderName) setErrors({ ...errors, accountHolderName: "" });
                    }}
                    placeholder="Full name as per bank"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-emerald-400/30 focus-visible:border-emerald-400/50"
                  />
                  {errors.accountHolderName && (
                    <p className="text-red-400 text-xs mt-1">{errors.accountHolderName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountNumber" className="text-white text-sm font-medium">
                    Bank Account Number *
                  </Label>
                  <Input
                    id="accountNumber"
                    type="text"
                    value={accountNumber}
                    onChange={(e) => {
                      setAccountNumber(e.target.value.replace(/\D/g, ""));
                      if (errors.accountNumber) setErrors({ ...errors, accountNumber: "" });
                    }}
                    placeholder="1234567890"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-emerald-400/30 focus-visible:border-emerald-400/50"
                  />
                  {errors.accountNumber && (
                    <p className="text-red-400 text-xs mt-1">{errors.accountNumber}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ifscCode" className="text-white text-sm font-medium">
                    IFSC Code *
                  </Label>
                  <Input
                    id="ifscCode"
                    type="text"
                    value={ifscCode}
                    onChange={(e) => {
                      setIfscCode(e.target.value.toUpperCase());
                      if (errors.ifscCode) setErrors({ ...errors, ifscCode: "" });
                    }}
                    placeholder="SBIN0001234"
                    maxLength={11}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-emerald-400/30 focus-visible:border-emerald-400/50"
                  />
                  {errors.ifscCode && (
                    <p className="text-red-400 text-xs mt-1">{errors.ifscCode}</p>
                  )}
                </div>

                <p className="text-white/50 text-xs italic">
                  Make sure the name matches your bank records
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-white/10 p-4 bg-[#0f1012]/95 backdrop-blur-sm">
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={onClose}
              className="flex-1 text-white/60 hover:text-white hover:bg-white/5 h-10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 h-10 rounded-md bg-white/90 hover:bg-white text-black font-medium shadow-none"
            >
              Save Details
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
