import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

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
    // Basic UPI format validation: something@something
    const upiRegex = /^[\w.-]+@[\w.-]+$/;
    return upiRegex.test(upi);
  };

  const validateIFSC = (ifsc: string) => {
    // IFSC format: 4 letters + 7 digits
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8 relative animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Title */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">
            Where should we send your earnings?
          </h2>
          <p className="text-white/60 text-sm">
            We'll collect payments for this event and transfer your earnings after the event ends.
          </p>
        </div>

        {/* Payout Method Selection */}
        <div className="space-y-4 mb-6">
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
                  ? "border-green-400/60 bg-green-400/10 text-white"
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
                  ? "border-green-400/60 bg-green-400/10 text-white"
                  : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              <div className="text-sm font-medium">Bank Account</div>
            </button>
          </div>
        </div>

        {/* UPI Form */}
        {payoutMethod === "upi" && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="upiId" className="text-white text-sm font-medium mb-2 block">
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
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-green-400/60"
              />
              {errors.upiId && (
                <p className="text-red-400 text-xs mt-1">{errors.upiId}</p>
              )}
              <p className="text-white/50 text-xs mt-2">
                ✨ Fastest way to receive payouts
              </p>
            </div>
          </div>
        )}

        {/* Bank Account Form */}
        {payoutMethod === "bank" && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="accountHolderName" className="text-white text-sm font-medium mb-2 block">
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
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-green-400/60"
              />
              {errors.accountHolderName && (
                <p className="text-red-400 text-xs mt-1">{errors.accountHolderName}</p>
              )}
            </div>

            <div>
              <Label htmlFor="accountNumber" className="text-white text-sm font-medium mb-2 block">
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
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-green-400/60"
              />
              {errors.accountNumber && (
                <p className="text-red-400 text-xs mt-1">{errors.accountNumber}</p>
              )}
            </div>

            <div>
              <Label htmlFor="ifscCode" className="text-white text-sm font-medium mb-2 block">
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
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-green-400/60"
              />
              {errors.ifscCode && (
                <p className="text-red-400 text-xs mt-1">{errors.ifscCode}</p>
              )}
            </div>

            <p className="text-white/50 text-xs">
              Make sure the name matches your bank records
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 mt-8">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white border-0"
          >
            Save & Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
