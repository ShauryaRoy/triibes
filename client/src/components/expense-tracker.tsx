import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, 
  DollarSign, 
  Receipt, 
  Users, 
  Percent, 
  Calculator, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle,
  AlertCircle,
  ArrowRight,
  PieChart,
  FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

interface ExpenseTrackerProps {
  eventId: number;
}

interface SplitDetails {
  [userId: string]: {
    amount?: number;
    percentage?: number;
  };
}

interface Balance {
  userId: string;
  userName: string;
  netBalance: number; // positive if owed money, negative if owes money
  owedBy: { [userId: string]: number }; // who owes this user money
  owesTo: { [userId: string]: number }; // who this user owes money to
}

export default function ExpenseTracker({ eventId }: ExpenseTrackerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSettlementDialogOpen, setIsSettlementDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'expenses' | 'balances' | 'settlements'>('expenses');
  
  // Form states
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [splitType, setSplitType] = useState<'equal' | 'custom_percentage' | 'custom_amount'>('equal');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [customSplit, setCustomSplit] = useState<SplitDetails>({});
  
  // Settlement states
  const [settlementFromUser, setSettlementFromUser] = useState("");
  const [settlementToUser, setSettlementToUser] = useState("");
  const [settlementAmount, setSettlementAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");

  // Fetch event details to get host info
  const { data: eventData } = useQuery({
    queryKey: [`/api/events/${eventId}`],
  });
  const event = eventData as any;

  // Fetch event attendees (people who RSVP'd as going)
  const { data: rsvps = [] } = useQuery({
    queryKey: [`/api/events/${eventId}/rsvps`],
  });

  // Get attendees from RSVPs (only those going) + fallback options
  const rsvpAttendees = (rsvps as any[])
    .filter((rsvp: any) => rsvp.status === 'going')
    .map((rsvp: any) => rsvp.user)
    .filter(Boolean);

  // If no RSVPs, include at least the current user
  let attendees = rsvpAttendees.length > 0 ? rsvpAttendees : [];
  
  // Add current user as fallback if no attendees
  if (attendees.length === 0 && user) {
    attendees = [user];
  }

  const { data: expenseData = [], isLoading, error: expensesError } = useQuery({
    queryKey: [`/api/events/${eventId}/expenses`],
  });
  const expenses = expenseData as any[];

  // Debug logging
  console.log('[ExpenseTracker] Component mounted with eventId:', eventId);
  console.log('[ExpenseTracker] Loading:', isLoading, 'Error:', expensesError, 'Expenses count:', expenses?.length);

  const { data: settlementData = [] } = useQuery({
    queryKey: [`/api/events/${eventId}/settlements`],
  });

  // Show error if expenses fail to load
  if (expensesError) {
    return (
      <div className="flex items-center justify-center py-8 text-red-400">
        <p>Error loading expenses: {expensesError instanceof Error ? expensesError.message : 'Unknown error'}</p>
      </div>
    );
  }
  const settlements = settlementData as any[];

  // Calculate balances - who owes whom
  const balances = useMemo(() => {
    const balanceMap: { [userId: string]: Balance } = {};
    
    // Initialize balance for all attendees
    attendees.forEach((attendee: any) => {
      balanceMap[attendee.id] = {
        userId: attendee.id,
        userName: `${attendee.firstName} ${attendee.lastName}`,
        netBalance: 0,
        owedBy: {},
        owesTo: {}
      };
    });

    // Process each expense
    expenses.forEach((expense: any) => {
      const payerId = expense.paidBy;
      const totalAmount = parseFloat(expense.amount);
      const splitDetails = expense.splitDetails || {};
      
      // Calculate how much each person owes for this expense
      Object.entries(splitDetails).forEach(([userId, details]: [string, any]) => {
        if (userId === payerId) return; // Payer doesn't owe themselves
        
        const owedAmount = details.amount || 0;
        
        if (!balanceMap[userId] || !balanceMap[payerId]) return;
        
        // User owes money to the payer
        balanceMap[userId].netBalance -= owedAmount;
        balanceMap[userId].owesTo[payerId] = (balanceMap[userId].owesTo[payerId] || 0) + owedAmount;
        
        // Payer is owed money by the user
        balanceMap[payerId].netBalance += owedAmount;
        balanceMap[payerId].owedBy[userId] = (balanceMap[payerId].owedBy[userId] || 0) + owedAmount;
      });
    });

    return Object.values(balanceMap).filter(balance => 
      Math.abs(balance.netBalance) > 0.01 || 
      Object.keys(balance.owedBy).length > 0 || 
      Object.keys(balance.owesTo).length > 0
    );
  }, [expenses, attendees]);

  // Calculate optimal settlements (simplified debt resolution)
  const optimalSettlements = useMemo(() => {
    const settlements: Array<{
      from: string;
      to: string;
      amount: number;
      fromName: string;
      toName: string;
    }> = [];

    // Create copies of balances for manipulation
    const creditors = balances.filter(b => b.netBalance > 0.01).map(b => ({ ...b }));
    const debtors = balances.filter(b => b.netBalance < -0.01).map(b => ({ ...b, netBalance: Math.abs(b.netBalance) }));

    // Greedy algorithm to minimize transactions
    while (creditors.length > 0 && debtors.length > 0) {
      const creditor = creditors[0];
      const debtor = debtors[0];
      
      const settleAmount = Math.min(creditor.netBalance, debtor.netBalance);
      
      settlements.push({
        from: debtor.userId,
        to: creditor.userId,
        amount: settleAmount,
        fromName: debtor.userName,
        toName: creditor.userName
      });

      creditor.netBalance -= settleAmount;
      debtor.netBalance -= settleAmount;

      if (creditor.netBalance < 0.01) creditors.shift();
      if (debtor.netBalance < 0.01) debtors.shift();
    }

    return settlements;
  }, [balances]);

  const createExpenseMutation = useMutation({
    mutationFn: async (expenseData: any) => {
      const response = await apiRequest("POST", `/api/events/${eventId}/expenses`, expenseData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/expenses`] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}`] });
      toast({
        title: "Expense added!",
        description: "Your expense has been recorded and split calculated.",
      });
      setIsCreateDialogOpen(false);
      resetExpenseForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add expense. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createSettlementMutation = useMutation({
    mutationFn: async (settlementData: any) => {
      const response = await apiRequest("POST", `/api/events/${eventId}/settlements`, settlementData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/settlements`] });
      toast({
        title: "Settlement recorded!",
        description: "The payment has been marked as settled.",
      });
      setIsSettlementDialogOpen(false);
      resetSettlementForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to record settlement. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetExpenseForm = () => {
    setDescription("");
    setAmount("");
    setCategory("");
    setSplitType('equal');
    setSelectedParticipants([]);
    setCustomSplit({});
  };

  const resetSettlementForm = () => {
    setSettlementFromUser("");
    setSettlementToUser("");
    setSettlementAmount("");
    setPaymentNote("");
  };

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to add expenses.",
        variant: "destructive",
      });
      return;
    }

    if (!description.trim() || !amount.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide both description and amount.",
        variant: "destructive",
      });
      return;
    }

    if (selectedParticipants.length === 0) {
      toast({
        title: "No participants selected",
        description: "Please select who should split this expense.",
        variant: "destructive",
      });
      return;
    }

    const totalAmount = parseFloat(amount);
    let splitDetails: SplitDetails = {};

    // Calculate split based on type
    if (splitType === 'equal') {
      const equalAmount = totalAmount / selectedParticipants.length;
      selectedParticipants.forEach(userId => {
        splitDetails[userId] = { amount: equalAmount };
      });
    } else if (splitType === 'custom_percentage') {
      // Validate percentages add up to 100
      const totalPercentage = Object.values(customSplit).reduce((sum, split) => 
        sum + (split.percentage || 0), 0);
      
      if (Math.abs(totalPercentage - 100) > 0.01) {
        toast({
          title: "Invalid percentages",
          description: "Percentages must add up to 100%.",
          variant: "destructive",
        });
        return;
      }

      selectedParticipants.forEach(userId => {
        const percentage = customSplit[userId]?.percentage || 0;
        splitDetails[userId] = { 
          percentage,
          amount: (totalAmount * percentage) / 100
        };
      });
    } else if (splitType === 'custom_amount') {
      // Validate amounts add up to total
      const totalSplit = Object.values(customSplit).reduce((sum, split) => 
        sum + (split.amount || 0), 0);
      
      if (Math.abs(totalSplit - totalAmount) > 0.01) {
        toast({
          title: "Invalid amounts",
          description: `Split amounts must add up to $${totalAmount.toFixed(2)}.`,
          variant: "destructive",
        });
        return;
      }

      selectedParticipants.forEach(userId => {
        splitDetails[userId] = customSplit[userId] || { amount: 0 };
      });
    }

    createExpenseMutation.mutate({
      description,
      amount: totalAmount,
      category,
      splitType,
      splitDetails,
    });
  };

  const handleSettlementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!settlementFromUser || !settlementToUser || !settlementAmount) {
      toast({
        title: "Missing information",
        description: "Please fill in all settlement details.",
        variant: "destructive",
      });
      return;
    }

    createSettlementMutation.mutate({
      fromUserId: settlementFromUser,
      toUserId: settlementToUser,
      amount: parseFloat(settlementAmount),
      paymentNote,
      status: 'settled',
      settledAt: new Date(),
    });
  };

  const calculateTotal = () => {
    return expenses.reduce((total: number, expense: any) => total + parseFloat(expense.amount), 0);
  };

  const formatCurrency = (amount: number | string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(typeof amount === 'string' ? parseFloat(amount) : amount);
  };

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants(prev => {
      const newParticipants = prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId];
      
      // Reset custom split when participants change
      if (splitType !== 'equal') {
        setCustomSplit({});
      }
      
      return newParticipants;
    });
  };

  const updateCustomSplit = (userId: string, field: 'amount' | 'percentage', value: number) => {
    setCustomSplit(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: value
      }
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-white">Expense Management {expenses.length > 0 && `(${expenses.length})`}</h3>
        <div className="flex gap-2">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gaming-button">
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-effect max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Expense</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleExpenseSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Pizza & Drinks"
                      className="bg-dark-card border-dark-border text-white placeholder:text-gray-400"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="amount">Amount ($)</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="120.00"
                        className="bg-dark-card border-dark-border text-white placeholder:text-gray-400"
                      />
                    </div>
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Input
                        id="category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        placeholder="Food & Drinks"
                        className="bg-dark-card border-dark-border text-white placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Split Type Selection */}
                <div className="space-y-3">
                  <Label>How to split this expense?</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant={splitType === 'equal' ? 'default' : 'outline'}
                      onClick={() => setSplitType('equal')}
                      className="h-auto p-3 flex-col"
                    >
                      <Users className="h-4 w-4 mb-1" />
                      <span className="text-xs">Equal Split</span>
                    </Button>
                    <Button
                      type="button"
                      variant={splitType === 'custom_percentage' ? 'default' : 'outline'}
                      onClick={() => setSplitType('custom_percentage')}
                      className="h-auto p-3 flex-col"
                    >
                      <Percent className="h-4 w-4 mb-1" />
                      <span className="text-xs">By Percentage</span>
                    </Button>
                    <Button
                      type="button"
                      variant={splitType === 'custom_amount' ? 'default' : 'outline'}
                      onClick={() => setSplitType('custom_amount')}
                      className="h-auto p-3 flex-col"
                    >
                      <Calculator className="h-4 w-4 mb-1" />
                      <span className="text-xs">Custom Amount</span>
                    </Button>
                  </div>
                </div>

                {/* Participant Selection */}
                <div className="space-y-3">
                  <Label>Who should split this expense?</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {attendees.map((attendee: any) => (
                      <div
                        key={attendee.id}
                        className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedParticipants.includes(attendee.id)
                            ? 'border-primary bg-primary/10'
                            : 'border-dark-border bg-dark-card hover:border-primary/50'
                        }`}
                        onClick={() => toggleParticipant(attendee.id)}
                      >
                        <Avatar className="w-8 h-8 mr-3">
                          <AvatarImage src={attendee.profileImageUrl} />
                          <AvatarFallback>
                            {attendee.firstName?.[0]}{attendee.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{attendee.firstName} {attendee.lastName}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Custom Split Details */}
                {splitType !== 'equal' && selectedParticipants.length > 0 && (
                  <div className="space-y-3">
                    <Label>
                      {splitType === 'custom_percentage' ? 'Set Percentages' : 'Set Amounts'}
                    </Label>
                    <div className="space-y-2">
                      {selectedParticipants.map(userId => {
                        const attendee = attendees.find((a: any) => a.id === userId);
                        return (
                          <div key={userId} className="flex items-center justify-between p-3 bg-dark-card rounded-lg">
                            <div className="flex items-center">
                              <Avatar className="w-6 h-6 mr-2">
                                <AvatarImage src={attendee?.profileImageUrl} />
                                <AvatarFallback className="text-xs">
                                  {attendee?.firstName?.[0]}{attendee?.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{attendee?.firstName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                step={splitType === 'custom_percentage' ? '0.1' : '0.01'}
                                placeholder={splitType === 'custom_percentage' ? '25' : '30.00'}
                                className="w-20 h-8 bg-background border-dark-border text-white text-sm"
                                value={splitType === 'custom_percentage' 
                                  ? customSplit[userId]?.percentage || '' 
                                  : customSplit[userId]?.amount || ''}
                                onChange={(e) => updateCustomSplit(
                                  userId, 
                                  splitType === 'custom_percentage' ? 'percentage' : 'amount',
                                  parseFloat(e.target.value) || 0
                                )}
                              />
                              <span className="text-sm text-gray-400">
                                {splitType === 'custom_percentage' ? '%' : '$'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full gaming-button"
                  disabled={createExpenseMutation.isPending}
                >
                  {createExpenseMutation.isPending ? "Adding..." : "Add Expense"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isSettlementDialogOpen} onOpenChange={setIsSettlementDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <CheckCircle className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-effect">
              <DialogHeader>
                <DialogTitle>Record Settlement</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSettlementSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="from-user">From</Label>
                    <Select value={settlementFromUser} onValueChange={setSettlementFromUser}>
                      <SelectTrigger className="bg-dark-card border-dark-border text-white">
                        <SelectValue placeholder="Select person paying" />
                      </SelectTrigger>
                      <SelectContent>
                        {attendees.map((attendee: any) => (
                          <SelectItem key={attendee.id} value={attendee.id}>
                            {attendee.firstName} {attendee.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="to-user">To</Label>
                    <Select value={settlementToUser} onValueChange={setSettlementToUser}>
                      <SelectTrigger className="bg-dark-card border-dark-border text-white">
                        <SelectValue placeholder="Select person receiving" />
                      </SelectTrigger>
                      <SelectContent>
                        {attendees.map((attendee: any) => (
                          <SelectItem key={attendee.id} value={attendee.id}>
                            {attendee.firstName} {attendee.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="settlement-amount">Amount ($)</Label>
                  <Input
                    id="settlement-amount"
                    type="number"
                    step="0.01"
                    value={settlementAmount}
                    onChange={(e) => setSettlementAmount(e.target.value)}
                    placeholder="25.50"
                    className="bg-dark-card border-dark-border text-white placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <Label htmlFor="payment-note">Payment Note (Optional)</Label>
                  <Textarea
                    id="payment-note"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    placeholder="Venmo, Cash, etc."
                    className="bg-dark-card border-dark-border text-white placeholder:text-gray-400"
                    rows={2}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full gaming-button"
                  disabled={createSettlementMutation.isPending}
                >
                  {createSettlementMutation.isPending ? "Recording..." : "Record Settlement"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="expenses" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">Expenses</span>
          </TabsTrigger>
          <TabsTrigger value="balances" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            <span className="hidden sm:inline">Balances</span>
          </TabsTrigger>
          <TabsTrigger value="settlements" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Settlements</span>
          </TabsTrigger>
        </TabsList>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          <div className="space-y-3">
            {expenses.map((expense: any) => (
              <div key={expense.id} className="p-4 bg-dark-card rounded-lg border border-dark-border">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={expense.payer?.profileImageUrl} />
                      <AvatarFallback>
                        {expense.payer?.firstName?.[0]}{expense.payer?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{expense.description}</p>
                      <p className="text-sm text-muted-foreground">
                        Paid by {expense.payer?.firstName} {expense.payer?.lastName}
                        {expense.category && ` • ${expense.category}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">{formatCurrency(expense.amount)}</p>
                    <Badge variant="outline" className="text-xs">
                      {expense.splitType === 'equal' ? 'Equal Split' : 
                       expense.splitType === 'custom_percentage' ? 'Custom %' : 'Custom Amount'}
                    </Badge>
                  </div>
                </div>
                
                {/* Split Details */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                  {Object.entries(expense.splitDetails || {}).map(([userId, details]: [string, any]) => {
                    const attendee = attendees.find((a: any) => a.id === userId);
                    return (
                      <div key={userId} className="flex items-center justify-between p-2 bg-background/50 rounded">
                        <span className="truncate">{attendee?.firstName || 'Unknown'}</span>
                        <span className="font-medium">{formatCurrency(details.amount)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {expenses.length === 0 && (
              <div className="text-center py-12 text-white/60 bg-white/5 rounded-lg border border-white/10">
                <Receipt className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-semibold mb-2">No expenses yet</p>
                <p className="text-sm">Add the first expense to start tracking costs</p>
                {user && (
                  <Button 
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="mt-4 gaming-button"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Expense
                  </Button>
                )}
              </div>
            )}
          </div>

          {expenses.length > 0 && (
            <div className="p-4 bg-gradient-to-r from-primary/20 to-cyan-400/20 rounded-lg border border-primary/30">
              <div className="flex items-center justify-between">
                <span className="font-medium">Total Expenses:</span>
                <span className="text-2xl font-bold text-primary">{formatCurrency(calculateTotal())}</span>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Balances Tab */}
        <TabsContent value="balances" className="space-y-4">
          <div className="space-y-3">
            {balances.map((balance) => (
              <div key={balance.userId} className="p-4 bg-dark-card rounded-lg border border-dark-border">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback>
                        {balance.userName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{balance.userName}</p>
                      <p className="text-sm text-muted-foreground">
                        Net Balance: {' '}
                        <span className={balance.netBalance > 0 ? 'text-green-400' : 'text-red-400'}>
                          {formatCurrency(Math.abs(balance.netBalance))}
                          {balance.netBalance > 0 ? ' (owed to you)' : ' (you owe)'}
                        </span>
                      </p>
                    </div>
                  </div>
                  {balance.netBalance > 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-400" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-400" />
                  )}
                </div>

                {/* Detailed breakdown */}
                {Object.keys(balance.owedBy).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-green-400">Owed by others:</p>
                    {Object.entries(balance.owedBy).map(([userId, amount]) => {
                      const attendee = attendees.find((a: any) => a.id === userId);
                      return (
                        <div key={userId} className="flex justify-between text-sm">
                          <span>{attendee?.firstName} {attendee?.lastName}</span>
                          <span className="text-green-400">{formatCurrency(amount)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {Object.keys(balance.owesTo).length > 0 && (
                  <div className="space-y-2 mt-3">
                    <p className="text-sm font-medium text-red-400">You owe:</p>
                    {Object.entries(balance.owesTo).map(([userId, amount]) => {
                      const attendee = attendees.find((a: any) => a.id === userId);
                      return (
                        <div key={userId} className="flex justify-between text-sm">
                          <span>{attendee?.firstName} {attendee?.lastName}</span>
                          <span className="text-red-400">{formatCurrency(amount)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {balances.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <PieChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>All settled up!</p>
                <p className="text-sm">No outstanding balances</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Settlements Tab */}
        <TabsContent value="settlements" className="space-y-4">
          {/* Suggested Settlements */}
          {optimalSettlements.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-400" />
                <h4 className="font-medium">Suggested Settlements</h4>
              </div>
              {optimalSettlements.map((settlement, index) => (
                <div key={index} className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs">
                          {settlement.fromName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs">
                          {settlement.toName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm">
                          <span className="font-medium">{settlement.fromName}</span> pays{' '}
                          <span className="font-medium">{settlement.toName}</span>
                        </p>
                        <p className="text-lg font-semibold text-amber-400">
                          {formatCurrency(settlement.amount)}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSettlementFromUser(settlement.from);
                        setSettlementToUser(settlement.to);
                        setSettlementAmount(settlement.amount.toString());
                        setIsSettlementDialogOpen(true);
                      }}
                    >
                      Mark as Paid
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Settlement History */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Settlement History
            </h4>
            {settlements.map((settlement: any) => (
              <div key={settlement.id} className="p-4 bg-dark-card rounded-lg border border-dark-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={settlement.fromUser?.profileImageUrl} />
                      <AvatarFallback>
                        {settlement.fromUser?.firstName?.[0]}{settlement.fromUser?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={settlement.toUser?.profileImageUrl} />
                      <AvatarFallback>
                        {settlement.toUser?.firstName?.[0]}{settlement.toUser?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm">
                        <span className="font-medium">{settlement.fromUser?.firstName} {settlement.fromUser?.lastName}</span> paid{' '}
                        <span className="font-medium">{settlement.toUser?.firstName} {settlement.toUser?.lastName}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(settlement.settledAt).toLocaleDateString()}
                        {settlement.paymentNote && ` • ${settlement.paymentNote}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-400">{formatCurrency(settlement.amount)}</p>
                    <Badge variant="outline" className="text-xs text-green-400 border-green-400">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Settled
                    </Badge>
                  </div>
                </div>
              </div>
            ))}

            {settlements.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No settlements yet</p>
                <p className="text-sm">Payments will appear here once recorded</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
