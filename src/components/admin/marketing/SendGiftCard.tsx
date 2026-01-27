'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Upload, Calendar, DollarSign, Gift, Image as ImageIcon } from 'lucide-react';

export function SendGiftCard() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    amount: '',
    senderFirstName: '',
    senderLastName: '',
    senderEmail: '',
    recipientName: '',
    recipientEmail: '',
    message: '',
    sendOption: 'now' as 'now' | 'later',
    scheduleDate: '',
    scheduleTime: '',
    excludeMinimumValidation: false,
  });

  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.excludeMinimumValidation && parseFloat(formData.amount) < 150) {
      toast({
        title: 'Validation Error',
        description: 'Minimum gift card amount is $150.00',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.senderFirstName || !formData.senderLastName || !formData.senderEmail) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all sender information',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.recipientName || !formData.recipientEmail) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all recipient information',
        variant: 'destructive',
      });
      return;
    }

    if (formData.sendOption === 'later' && (!formData.scheduleDate || !formData.scheduleTime)) {
      toast({
        title: 'Validation Error',
        description: 'Please select schedule date and time',
        variant: 'destructive',
      });
      return;
    }

    // Success
    toast({
      title: 'Gift Card Sent!',
      description: `Gift card of $${formData.amount} sent to ${formData.recipientName}`,
    });

    // Reset form
    setFormData({
      amount: '',
      senderFirstName: '',
      senderLastName: '',
      senderEmail: '',
      recipientName: '',
      recipientEmail: '',
      message: '',
      sendOption: 'now',
      scheduleDate: '',
      scheduleTime: '',
      excludeMinimumValidation: false,
    });
    setSelectedImage(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Send Gift Card</h2>
        <p className="text-muted-foreground">Create and send a personalized gift card to your customers.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Section */}
        <Card>
          <CardHeader>
            <CardTitle>Gift Card Details</CardTitle>
            <CardDescription>Fill in the gift card information and recipient details.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Gift Card Image</Label>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="image-upload"
                      />
                      <label htmlFor="image-upload" className="cursor-pointer">
                        {selectedImage ? (
                          <img
                            src={selectedImage}
                            alt="Gift card preview"
                            className="max-h-20 mx-auto rounded"
                          />
                        ) : (
                          <div className="space-y-2">
                            <ImageIcon className="h-8 w-8 mx-auto text-gray-400" />
                            <p className="text-sm text-gray-600">Click to upload or choose from gallery</p>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>
                  <Button type="button" variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Gallery
                  </Button>
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">Gift Card Amount</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="150.00"
                    value={formData.amount}
                    onChange={(e) => handleInputChange('amount', e.target.value)}
                    className="pl-9"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Minimum amount: $150.00</p>
              </div>

              {/* Sender Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Sender Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="senderFirstName">First Name</Label>
                    <Input
                      id="senderFirstName"
                      placeholder="John"
                      value={formData.senderFirstName}
                      onChange={(e) => handleInputChange('senderFirstName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="senderLastName">Last Name</Label>
                    <Input
                      id="senderLastName"
                      placeholder="Doe"
                      value={formData.senderLastName}
                      onChange={(e) => handleInputChange('senderLastName', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senderEmail">Email</Label>
                  <Input
                    id="senderEmail"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.senderEmail}
                    onChange={(e) => handleInputChange('senderEmail', e.target.value)}
                  />
                </div>
              </div>

              {/* Recipient Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Recipient Information</h3>
                <div className="space-y-2">
                  <Label htmlFor="recipientName">Name</Label>
                  <Input
                    id="recipientName"
                    placeholder="Jane Smith"
                    value={formData.recipientName}
                    onChange={(e) => handleInputChange('recipientName', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recipientEmail">Email</Label>
                  <Input
                    id="recipientEmail"
                    type="email"
                    placeholder="jane@example.com"
                    value={formData.recipientEmail}
                    onChange={(e) => handleInputChange('recipientEmail', e.target.value)}
                  />
                </div>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Add a personal message..."
                  value={formData.message}
                  onChange={(e) => handleInputChange('message', e.target.value)}
                  rows={3}
                />
              </div>

              {/* Send Options */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Send Options</h3>
                <div className="space-y-2">
                  <Label>When to send</Label>
                  <Select
                    value={formData.sendOption}
                    onValueChange={(value: 'now' | 'later') => handleInputChange('sendOption', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="now">Send Now</SelectItem>
                      <SelectItem value="later">Send on Specific Date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.sendOption === 'later' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="scheduleDate">Date</Label>
                      <Input
                        id="scheduleDate"
                        type="date"
                        value={formData.scheduleDate}
                        onChange={(e) => handleInputChange('scheduleDate', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="scheduleTime">Time</Label>
                      <Input
                        id="scheduleTime"
                        type="time"
                        value={formData.scheduleTime}
                        onChange={(e) => handleInputChange('scheduleTime', e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Exclude Minimum Validation */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="exclude-minimum"
                  checked={formData.excludeMinimumValidation}
                  onCheckedChange={(checked) => handleInputChange('excludeMinimumValidation', checked)}
                />
                <Label htmlFor="exclude-minimum" className="text-sm">
                  Exclude minimum amount validation
                </Label>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
                <Button type="submit">
                  <Gift className="h-4 w-4 mr-2" />
                  Send Gift Card
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Preview Section */}
        <Card>
          <CardHeader>
            <CardTitle>Gift Card Preview</CardTitle>
            <CardDescription>See how your gift card will look.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Gift Card Preview */}
              <div className="relative">
                <div className="bg-gradient-to-br from-pink-400 to-pink-600 rounded-lg p-8 text-white relative overflow-hidden">
                  {/* Background Pattern */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-4 right-4 w-24 h-24 bg-white rounded-full"></div>
                    <div className="absolute bottom-4 left-4 w-16 h-16 bg-white rounded-full"></div>
                  </div>
                  
                  {/* House Icon */}
                  <div className="relative z-10 text-center mb-4">
                    <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-lg flex items-center justify-center">
                      <Gift className="h-8 w-8" />
                    </div>
                  </div>

                  {/* Congratulations Text */}
                  <div className="relative z-10 text-center mb-6">
                    <h3 className="text-2xl font-bold mb-2">Congratulations!</h3>
                    <p className="text-white/80">You've received a special gift</p>
                  </div>

                  {/* Amount */}
                  <div className="relative z-10 text-center mb-6">
                    <div className="text-4xl font-bold">
                      ${formData.amount || '0.00'}
                    </div>
                  </div>

                  {/* To/From */}
                  <div className="relative z-10 border-t border-white/20 pt-4">
                    <div className="flex justify-between text-sm">
                      <div>
                        <p className="text-white/60 text-xs mb-1">To:</p>
                        <p className="font-medium">{formData.recipientName || 'Recipient Name'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white/60 text-xs mb-1">From:</p>
                        <p className="font-medium">
                          {formData.senderFirstName && formData.senderLastName 
                            ? `${formData.senderFirstName} ${formData.senderLastName}`
                            : 'Sender Name'
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Custom Image Overlay */}
                  {selectedImage && (
                    <div className="absolute inset-0 opacity-20 pointer-events-none">
                      <img
                        src={selectedImage}
                        alt="Custom background"
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Message Preview */}
              {formData.message && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Personal Message:</h4>
                  <p className="text-sm text-gray-600">{formData.message}</p>
                </div>
              )}

              {/* Delivery Info */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Delivery Information:</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>To:</strong> {formData.recipientEmail || 'Not specified'}</p>
                  <p><strong>From:</strong> {formData.senderEmail || 'Not specified'}</p>
                  <p><strong>When:</strong> {formData.sendOption === 'now' ? 'Immediately' : 
                    formData.scheduleDate && formData.scheduleTime 
                      ? `${formData.scheduleDate} at ${formData.scheduleTime}`
                      : 'Scheduled (date/time not set)'
                  }</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
