"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, MapPin, Users, DollarSign, Eye, Info, Printer, Send } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Booking {
  id: string;
  customer_name: string;
  customer_email: string;
  service: string;
  date: string;
  time: string;
  address: string;
  status: string;
  amount: number | string;
  assignedProvider?: string;
}

interface Provider {
  id: string;
  name: string;
}

interface SendScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookings: Booking[];
  providers: Provider[];
}

export function SendScheduleDialog({ open, onOpenChange, bookings, providers }: SendScheduleDialogProps) {
  const { toast } = useToast();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [providerFilter, setProviderFilter] = useState<"all" | "specific">("all");
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);

  // Filter bookings based on date range and provider selection
  const filteredBookings = useMemo(() => {
    let filtered = bookings;

    // Filter by date range
    if (startDate && endDate) {
      filtered = filtered.filter(booking => 
        booking.date >= startDate && booking.date <= endDate
      );
    }

    // Filter by providers
    if (providerFilter === "specific" && selectedProviders.length > 0) {
      filtered = filtered.filter(booking => 
        booking.assignedProvider && selectedProviders.includes(booking.assignedProvider)
      );
    }

    // Only include confirmed/pending bookings
    filtered = filtered.filter(booking => 
      ['confirmed', 'pending'].includes(booking.status)
    );

    return filtered.sort((a, b) => {
      // Sort by date and time
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });
  }, [bookings, startDate, endDate, providerFilter, selectedProviders]);

  const handleProviderToggle = (providerName: string) => {
    setSelectedProviders(prev => 
      prev.includes(providerName)
        ? prev.filter(p => p !== providerName)
        : [...prev, providerName]
    );
  };

  const handleSendSchedule = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Error",
        description: "Please select both start and end dates",
        variant: "destructive",
      });
      return;
    }

    if (providerFilter === "specific" && selectedProviders.length === 0) {
      toast({
        title: "Error", 
        description: "Please select at least one provider",
        variant: "destructive",
      });
      return;
    }

    if (filteredBookings.length === 0) {
      toast({
        title: "No Bookings",
        description: "No bookings found for the selected criteria",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    
    try {
      // TODO: Implement actual API call to send schedule
      const response = await fetch('/api/schedule/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate,
          endDate,
          providers: providerFilter === "all" ? "all" : selectedProviders,
          bookings: filteredBookings,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send schedule');
      }

      toast({
        title: "Schedule Sent Successfully",
        description: `Schedule has been sent to ${filteredBookings.length} booking(s)`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error sending schedule:', error);
      toast({
        title: "Error",
        description: "Failed to send schedule. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
  };

  const formatAmount = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Schedule
          </DialogTitle>
          <DialogDescription>
            Select date range and providers to send schedule notifications
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Date Range Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Select Schedule Period</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          
          {/* Provider Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Provider Selection</h3>
            <RadioGroup value={providerFilter} onValueChange={(value: "all" | "specific") => setProviderFilter(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all-providers" />
                <Label htmlFor="all-providers">All providers</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="specific" id="specific-providers" />
                <Label htmlFor="specific-providers">Specific provider(s)</Label>
              </div>
            </RadioGroup>

            {providerFilter === "specific" && (
              <div className="mt-4 space-y-2">
                <Label>Select Providers</Label>
                <div className="grid grid-cols-2 gap-3">
                  {providers.map((provider) => (
                    <div key={provider.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={provider.id}
                        checked={selectedProviders.includes(provider.name)}
                        onCheckedChange={() => handleProviderToggle(provider.name)}
                      />
                      <Label htmlFor={provider.id} className="text-sm">
                        {provider.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Schedule Table */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              Schedule Details ({filteredBookings.length} bookings)
            </h3>
            
            {filteredBookings.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left py-3 px-4 text-sm font-medium">Service date</th>
                        <th className="text-left py-3 px-4 text-sm font-medium">Customer Name</th>
                        <th className="text-left py-3 px-4 text-sm font-medium">Assigned to</th>
                        <th className="text-left py-3 px-4 text-sm font-medium">Location</th>
                        <th className="text-right py-3 px-4 text-sm font-medium">Price</th>
                        <th className="text-center py-3 px-4 text-sm font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBookings.map((booking) => (
                        <tr key={booking.id} className="border-b hover:bg-muted/20">
                          <td className="py-3 px-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {formatDate(booking.date)}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <div>
                              <div className="font-medium">{booking.customer_name}</div>
                              <div className="text-xs text-muted-foreground">{booking.customer_email}</div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              {booking.assignedProvider || "Unassigned"}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <div className="flex items-center gap-2 max-w-xs">
                              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="truncate">{booking.address}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-right font-medium">
                            <div className="flex items-center gap-1 justify-end">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              {formatAmount(booking.amount)}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <div className="flex items-center gap-2 justify-center">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Info className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No bookings found for the selected criteria
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-3">
          <Button
            variant="outline"
            onClick={handlePrint}
            className="flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button
            onClick={handleSendSchedule}
            disabled={isSending || filteredBookings.length === 0}
            className="flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            {isSending ? "Sending..." : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
