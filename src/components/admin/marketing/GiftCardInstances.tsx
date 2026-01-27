'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useBusiness } from '@/contexts/BusinessContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Search, Plus, Eye, Gift, Calendar, DollarSign } from 'lucide-react';
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

export function GiftCardInstances() {
  const { toast } = useToast();
  const { currentBusiness } = useBusiness();
  const [instances, setInstances] = useState<GiftCardInstance[]>([]);
  const [templates, setTemplates] = useState<GiftCardTemplate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [showValidationForm, setShowValidationForm] = useState(false);
  const [validationCode, setValidationCode] = useState('');
  const [validationResult, setValidationResult] = useState<any>(null);
  
  const [purchaseForm, setPurchaseForm] = useState({
    gift_card_id: '',
    quantity: 1,
    purchaser_email: '',
    recipient_email: '',
    message: '',
  });

  // Load gift card instances
  useEffect(() => {
    if (!currentBusiness?.id) return;
    
    const fetchInstances = async () => {
      const { data, error } = await supabase
        .from('gift_card_instances')
        .select(`
          *,
          gift_card:marketing_gift_cards(name, description, amount)
        `)
        .eq('business_id', currentBusiness.id)
        .order('purchase_date', { ascending: false });
      
      if (!error && data) {
        setInstances(data);
      }
    };

    const fetchTemplates = async () => {
      try {
        const response = await fetch(`/api/marketing/gift-cards?business_id=${currentBusiness.id}&active=true`);
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch gift card templates');
        }
        
        if (result.data) {
          setTemplates(result.data);
        }
      } catch (error: any) {
        console.error('Error fetching gift card templates:', error);
      }
    };

    fetchInstances();
    fetchTemplates();
  }, [currentBusiness]);

  // Filter instances
  const filteredInstances = instances.filter(instance => {
    const matchesSearch = 
      instance.unique_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      instance.gift_card?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      instance.purchaser_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      instance.recipient_email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || instance.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Purchase gift cards
  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness?.id || !purchaseForm.gift_card_id) return;

    try {
      const response = await fetch('/api/marketing/gift-cards/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...purchaseForm,
          business_id: currentBusiness.id,
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

      // Reset form and refresh instances
      setPurchaseForm({
        gift_card_id: '',
        quantity: 1,
        purchaser_email: '',
        recipient_email: '',
        message: '',
      });
      setShowPurchaseForm(false);

      // Refresh instances using API
      const refreshResponse = await fetch(`/api/marketing/gift-cards/instances?business_id=${currentBusiness.id}`);
      const refreshResult = await refreshResponse.json();
      
      if (refreshResponse.ok && refreshResult.data) {
        setInstances(refreshResult.data);
      }

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Validate gift card
  const handleValidate = async () => {
    if (!currentBusiness?.id || !validationCode.trim()) return;

    try {
      const response = await fetch(
        `/api/marketing/gift-cards/redeem?business_id=${currentBusiness.id}&unique_code=${validationCode.trim()}`
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

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
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

  if (showPurchaseForm) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Purchase Gift Cards</CardTitle>
          <CardDescription>
            Create new gift card instances for customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePurchase} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gift_card_id">Gift Card Type</Label>
                <Select
                  value={purchaseForm.gift_card_id}
                  onValueChange={(value) => setPurchaseForm(prev => ({ ...prev, gift_card_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gift card type" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(template => (
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
                  onChange={(e) => setPurchaseForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
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
                  onChange={(e) => setPurchaseForm(prev => ({ ...prev, purchaser_email: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="recipient_email">Recipient Email (optional)</Label>
                <Input
                  id="recipient_email"
                  type="email"
                  placeholder="recipient@example.com"
                  value={purchaseForm.recipient_email}
                  onChange={(e) => setPurchaseForm(prev => ({ ...prev, recipient_email: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Personal Message (optional)</Label>
              <Textarea
                id="message"
                placeholder="Add a personal message..."
                value={purchaseForm.message}
                onChange={(e) => setPurchaseForm(prev => ({ ...prev, message: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPurchaseForm(false)}
              >
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
          <CardDescription>
            Check the balance and validity of a gift card
          </CardDescription>
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
                            ${validationResult.current_balance.toFixed(2)}
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
                      <div className="text-red-600 text-sm">
                        {validationResult.error_message}
                      </div>
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
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gift Card Instances</h2>
        <div className="flex items-center space-x-4">
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search gift cards..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="fully_redeemed">Fully Redeemed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={() => setShowPurchaseForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Purchase
          </Button>
          
          <Button variant="outline" onClick={() => setShowValidationForm(true)}>
            <Eye className="h-4 w-4 mr-2" />
            Validate
          </Button>
        </div>
      </div>

      {filteredInstances.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || statusFilter !== 'all' 
                  ? 'No gift cards found' 
                  : 'No gift cards yet'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'Purchase your first gift cards to get started'}
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <Button onClick={() => setShowPurchaseForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Purchase Gift Cards
                </Button>
              )}
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInstances.map((instance) => (
                  <TableRow key={instance.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{instance.gift_card?.name}</div>
                        {instance.gift_card?.description && (
                          <div className="text-sm text-muted-foreground">
                            {instance.gift_card.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                        {instance.unique_code}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {instance.purchaser_email || 'Guest'}
                      </div>
                      {instance.recipient_email && instance.recipient_email !== instance.purchaser_email && (
                        <div className="text-xs text-muted-foreground">
                          → {instance.recipient_email}
                        </div>
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
                      <div className="text-sm">
                        <Calendar className="h-3 w-3 inline mr-1" />
                        {formatDate(instance.purchase_date)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDate(instance.expires_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadge(instance.status)}>
                        {instance.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
