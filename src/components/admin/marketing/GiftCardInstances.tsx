'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useBusiness } from '@/contexts/BusinessContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Search, Plus, Eye, Gift, Calendar, DollarSign, Trash2, History, Loader2 } from 'lucide-react';
import { marketingApiHeaders } from '@/lib/marketingApiHeaders';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type GiftCardInstance = {
  id: string;
  gift_card_id: string;
  unique_code: string;
  original_amount: number;
  current_balance: number;
  purchaser_id?: string;
  recipient_id?: string;
  purchaser_email?: string;
  recipient_email?: string;
  purchase_date: string;
  expires_at: string;
  status: 'active' | 'expired' | 'fully_redeemed' | 'cancelled';
  message?: string;
  gift_card?: {
    name: string;
    description?: string;
    amount: number;
  };
};

type GiftCardTemplate = {
  id: string;
  name: string;
  description?: string;
  amount: number;
  expires_in_months: number;
  auto_generate_codes: boolean;
  active: boolean;
};

type GiftCardTransaction = {
  id: string;
  gift_card_instance_id: string;
  transaction_type: 'purchase' | 'redemption' | 'refund' | 'adjustment';
  amount: number;
  balance_before: number;
  balance_after: number;
  description?: string | null;
  booking_id?: string | null;
  transaction_date: string;
  gift_card_instance?: {
    unique_code?: string;
    gift_card?: { name?: string };
  };
};

const TX_TYPE_LABELS: Record<string, string> = {
  purchase: 'Issued',
  redemption: 'Redeemed',
  refund: 'Refund',
  adjustment: 'Adjustment',
};

export function GiftCardInstances() {
  const { toast } = useToast();
  const { currentBusiness } = useBusiness();
  const [instances, setInstances] = useState<GiftCardInstance[]>([]);
  const [transactions, setTransactions] = useState<GiftCardTransaction[]>([]);
  const [templates, setTemplates] = useState<GiftCardTemplate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [instanceTab, setInstanceTab] = useState<'instances' | 'history'>('instances');
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [showValidationForm, setShowValidationForm] = useState(false);
  const [validationCode, setValidationCode] = useState('');
  const [validationResult, setValidationResult] = useState<{
    valid?: boolean;
    current_balance?: number;
    expires_at?: string;
    error_message?: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GiftCardInstance | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [purchaseForm, setPurchaseForm] = useState({
    gift_card_id: '',
    quantity: 1,
    purchaser_email: '',
    recipient_email: '',
    message: '',
  });

  const refreshInstances = useCallback(async () => {
    if (!currentBusiness?.id) return;
    const { data, error } = await supabase
      .from('gift_card_instances')
      .select(`
        *,
        gift_card:marketing_gift_cards(name, description, amount)
      `)
      .eq('business_id', currentBusiness.id)
      .order('purchase_date', { ascending: false });

    if (!error && data) {
      setInstances(data as GiftCardInstance[]);
    }
  }, [currentBusiness?.id]);

  const refreshHistory = useCallback(async () => {
    if (!currentBusiness?.id) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(
        `/api/marketing/gift-cards/transactions?business_id=${encodeURIComponent(currentBusiness.id)}&limit=100`,
        { headers: marketingApiHeaders(currentBusiness.id) },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load history');
      setTransactions(Array.isArray(json.data) ? json.data : []);
    } catch (err: unknown) {
      toast({
        title: 'Could not load history',
        description: err instanceof Error ? err.message : 'Try again later',
        variant: 'destructive',
      });
    } finally {
      setHistoryLoading(false);
    }
  }, [currentBusiness?.id, toast]);

  useEffect(() => {
    if (!currentBusiness?.id) return;

    void refreshInstances();

    (async () => {
      try {
        const response = await fetch(
          `/api/marketing/gift-cards?business_id=${currentBusiness.id}&active=true`,
          { headers: marketingApiHeaders(currentBusiness.id) },
        );
        const result = await response.json();
        if (response.ok && result.data) {
          setTemplates(result.data);
        }
      } catch (e) {
        console.error('Error fetching gift card templates', e);
      }
    })();
  }, [currentBusiness?.id, refreshInstances]);

  useEffect(() => {
    if (instanceTab === 'history' && currentBusiness?.id) {
      void refreshHistory();
    }
  }, [instanceTab, currentBusiness?.id, refreshHistory]);

  const filteredInstances = instances.filter((instance) => {
    const matchesSearch =
      instance.unique_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      instance.gift_card?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      instance.purchaser_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      instance.recipient_email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || instance.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const filteredTransactions = transactions.filter((tx) => {
    const code = tx.gift_card_instance?.unique_code ?? '';
    const name = tx.gift_card_instance?.gift_card?.name ?? '';
    const q = historySearch.toLowerCase();
    return (
      code.toLowerCase().includes(q) ||
      name.toLowerCase().includes(q) ||
      (tx.description ?? '').toLowerCase().includes(q) ||
      TX_TYPE_LABELS[tx.transaction_type]?.toLowerCase().includes(q)
    );
  });

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness?.id || !purchaseForm.gift_card_id) return;

    try {
      const response = await fetch('/api/marketing/gift-cards/instances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...marketingApiHeaders(currentBusiness.id),
        },
        body: JSON.stringify({
          ...purchaseForm,
          business_id: currentBusiness.id,
          send_email: Boolean(purchaseForm.recipient_email?.trim()),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to purchase gift cards');
      }

      toast({
        title: 'Gift Cards Purchased',
        description: `Successfully purchased ${purchaseForm.quantity} gift card(s)`,
      });

      setPurchaseForm({
        gift_card_id: '',
        quantity: 1,
        purchaser_email: '',
        recipient_email: '',
        message: '',
      });
      setShowPurchaseForm(false);
      await refreshInstances();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Purchase failed',
        variant: 'destructive',
      });
    }
  };

  const handleValidate = async () => {
    if (!currentBusiness?.id || !validationCode.trim()) return;

    try {
      const response = await fetch(
        `/api/marketing/gift-cards/redeem?business_id=${currentBusiness.id}&unique_code=${validationCode.trim()}`,
        { headers: marketingApiHeaders(currentBusiness.id) },
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Validation failed');
      }

      setValidationResult(result);
      toast({
        title: 'Gift Card Validated',
        description: result.valid ? 'Gift card is valid' : 'Gift card validation failed',
      });
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Validation failed',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteInstance = async () => {
    if (!deleteTarget || !currentBusiness?.id) return;
    setDeleteBusy(true);
    try {
      const res = await fetch(
        `/api/marketing/gift-cards/instances/${encodeURIComponent(deleteTarget.id)}?business_id=${encodeURIComponent(currentBusiness.id)}`,
        { method: 'DELETE', headers: marketingApiHeaders(currentBusiness.id) },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Delete failed');

      toast({
        title: 'Gift card cancelled',
        description: `Code ${deleteTarget.unique_code} can no longer be used.`,
      });
      setDeleteTarget(null);
      await refreshInstances();
      if (instanceTab === 'history') await refreshHistory();
    } catch (err: unknown) {
      toast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setDeleteBusy(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      expired: 'destructive',
      fully_redeemed: 'secondary',
      cancelled: 'outline',
    };
    return variants[status] || 'outline';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatTxAmount = (tx: GiftCardTransaction) => {
    const n = Number(tx.amount);
    if (tx.transaction_type === 'purchase' || tx.transaction_type === 'refund') {
      return `+$${Math.abs(n).toFixed(2)}`;
    }
    if (tx.transaction_type === 'redemption') {
      return `-$${Math.abs(n).toFixed(2)}`;
    }
    if (n === 0) return '$0.00';
    return n > 0 ? `+$${n.toFixed(2)}` : `-$${Math.abs(n).toFixed(2)}`;
  };

  if (showPurchaseForm) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Purchase Gift Cards</CardTitle>
          <CardDescription>Create new gift card instances for customers</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePurchase} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gift_card_id">Gift Card Type</Label>
                <Select
                  value={purchaseForm.gift_card_id}
                  onValueChange={(value) => setPurchaseForm((prev) => ({ ...prev, gift_card_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gift card type" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} - ${template.amount.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  max={10}
                  value={purchaseForm.quantity}
                  onChange={(e) =>
                    setPurchaseForm((prev) => ({ ...prev, quantity: parseInt(e.target.value, 10) || 1 }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="purchaser_email">Purchaser Email</Label>
                <Input
                  id="purchaser_email"
                  type="email"
                  placeholder="purchaser@example.com"
                  value={purchaseForm.purchaser_email}
                  onChange={(e) => setPurchaseForm((prev) => ({ ...prev, purchaser_email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recipient_email">Recipient Email (optional)</Label>
                <Input
                  id="recipient_email"
                  type="email"
                  placeholder="recipient@example.com"
                  value={purchaseForm.recipient_email}
                  onChange={(e) => setPurchaseForm((prev) => ({ ...prev, recipient_email: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Personal Message (optional)</Label>
              <Textarea
                id="message"
                placeholder="Add a personal message..."
                value={purchaseForm.message}
                onChange={(e) => setPurchaseForm((prev) => ({ ...prev, message: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowPurchaseForm(false)}>
                Cancel
              </Button>
              <Button type="submit">
                <Plus className="h-4 w-4 mr-2" />
                Purchase Gift Cards
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  if (showValidationForm) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Validate Gift Card</CardTitle>
          <CardDescription>Check the balance and validity of a gift card</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="validation_code">Gift Card Code</Label>
              <Input
                id="validation_code"
                placeholder="Enter gift card code"
                value={validationCode}
                onChange={(e) => setValidationCode(e.target.value.toUpperCase())}
                className="font-mono"
              />
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleValidate} disabled={!validationCode.trim()}>
                <Eye className="h-4 w-4 mr-2" />
                Validate
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowValidationForm(false);
                  setValidationCode('');
                  setValidationResult(null);
                }}
              >
                Back
              </Button>
            </div>
            {validationResult && (
              <Card className="mt-4">
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Status:</span>
                      <Badge variant={validationResult.valid ? 'default' : 'destructive'}>
                        {validationResult.valid ? 'Valid' : 'Invalid'}
                      </Badge>
                    </div>
                    {validationResult.valid && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Current Balance:</span>
                          <span className="text-green-600 font-bold">
                            ${Number(validationResult.current_balance ?? 0).toFixed(2)}
                          </span>
                        </div>
                        {validationResult.expires_at && (
                          <div className="flex items-center justify-between">
                            <span className="font-medium">Expires:</span>
                            <span>{formatDate(validationResult.expires_at)}</span>
                          </div>
                        )}
                      </>
                    )}
                    {validationResult.error_message && (
                      <div className="text-red-600 text-sm">{validationResult.error_message}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Gift Card Instances</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setShowPurchaseForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Purchase
          </Button>
          <Button variant="outline" onClick={() => setShowValidationForm(true)} className="dark:text-white">
            <Eye className="h-4 w-4 mr-2" />
            Validate
          </Button>
        </div>
      </div>

      <Tabs
        value={instanceTab}
        onValueChange={(v) => setInstanceTab(v as 'instances' | 'history')}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="instances">Instances</TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-1.5 inline" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="instances" className="space-y-4 mt-0">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-end">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search instances..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 dark:text-white dark:placeholder:text-white"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40 dark:text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="dark:text-white">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="fully_redeemed">Fully Redeemed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredInstances.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No gift cards found</h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm || statusFilter !== 'all'
                      ? 'Try adjusting your search or filter'
                      : 'Send or purchase gift cards to get started'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Gift Card</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Purchaser</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Purchased</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInstances.map((instance) => (
                      <TableRow key={instance.id}>
                        <TableCell>
                          <div className="font-medium">{instance.gift_card?.name}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded inline-block">
                            {instance.unique_code}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{instance.purchaser_email || 'Guest'}</div>
                          {instance.recipient_email &&
                            instance.recipient_email !== instance.purchaser_email && (
                              <div className="text-xs text-muted-foreground">→ {instance.recipient_email}</div>
                            )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 text-green-600 mr-1" />
                            <span className="font-medium text-green-600">
                              ${instance.current_balance.toFixed(2)}
                            </span>
                          </div>
                          {instance.current_balance < instance.original_amount && (
                            <div className="text-xs text-muted-foreground">
                              of ${instance.original_amount.toFixed(2)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Calendar className="h-3 w-3 inline mr-1" />
                          {formatDate(instance.purchase_date)}
                        </TableCell>
                        <TableCell>{formatDate(instance.expires_at)}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadge(instance.status)}>
                            {instance.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {instance.status !== 'cancelled' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                              onClick={() => setDeleteTarget(instance)}
                              title="Cancel gift card"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4 mt-0">
          <div className="flex justify-end">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search history..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {historyLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading history…
            </div>
          ) : filteredTransactions.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-40" />
                  <p>No transaction history yet</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-sm whitespace-nowrap">
                          {formatDateTime(tx.transaction_date)}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">
                            {tx.gift_card_instance?.unique_code ?? '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{TX_TYPE_LABELS[tx.transaction_type] ?? tx.transaction_type}</Badge>
                        </TableCell>
                        <TableCell
                          className={
                            tx.transaction_type === 'redemption'
                              ? 'text-red-600 font-medium'
                              : 'text-green-600 font-medium'
                          }
                        >
                          {formatTxAmount(tx)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          ${Number(tx.balance_before).toFixed(2)} → ${Number(tx.balance_after).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {tx.description ?? (tx.booking_id ? `Booking ${tx.booking_id.slice(0, 8)}…` : '—')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && !deleteBusy && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this gift card?</AlertDialogTitle>
            <AlertDialogDescription>
              Code <strong className="font-mono">{deleteTarget?.unique_code}</strong> will be marked cancelled and
              cannot be used at checkout. Transaction history is kept in the History tab.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>Keep</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => void handleDeleteInstance()}
              disabled={deleteBusy}
            >
              {deleteBusy ? 'Cancelling…' : 'Cancel gift card'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
