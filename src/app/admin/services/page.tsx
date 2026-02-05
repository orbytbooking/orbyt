"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Plus,
  Edit,
  Trash2,
  DollarSign,
  Clock
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

// Mock data
const servicesData = [
  {
    id: "SRV001",
    name: "Standard Cleaning",
    description: "Basic cleaning for regularly maintained spaces",
    price: 120,
    duration: "2-3 hours",
    features: ["Dusting & vacuuming", "Bathroom cleaning", "Kitchen cleaning", "Floor mopping"],
    active: true
  },
  {
    id: "SRV002",
    name: "Deep Cleaning",
    description: "Thorough cleaning for all areas",
    price: 250,
    duration: "4-6 hours",
    features: ["Everything in Standard", "Inside appliances", "Baseboards & trim", "Window sills", "Light fixtures"],
    active: true
  },
  {
    id: "SRV003",
    name: "Move In/Out",
    description: "Complete cleaning for moving",
    price: 350,
    duration: "4-8 hours",
    features: ["Everything in Deep", "Inside cabinets & drawers", "Closets cleaned", "Walls spot cleaned", "Blinds dusted"],
    active: true
  },
  {
    id: "SRV004",
    name: "Office Cleaning",
    description: "Professional workspace cleaning",
    price: 200,
    duration: "3-4 hours",
    features: ["Desk & surface cleaning", "Trash removal", "Floor care", "Restroom cleaning"],
    active: true
  },
  {
    id: "SRV005",
    name: "Carpet Cleaning",
    description: "Deep carpet cleaning service",
    price: 150,
    duration: "2-3 hours",
    features: ["Steam cleaning", "Stain removal", "Deodorizing", "Dries in 4-6 hours"],
    active: true
  },
];

const Services = () => {
  const [services, setServices] = useState(servicesData);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedService, setSelectedService] = useState<typeof servicesData[0] | null>(null);
  const [isNewService, setIsNewService] = useState(false);
  const { toast } = useToast();

  const handleEdit = (service: typeof servicesData[0]) => {
    setSelectedService(service);
    setIsNewService(false);
    setShowEditDialog(true);
  };

  const handleAddNew = () => {
    setSelectedService({
      id: `SRV${String(services.length + 1).padStart(3, '0')}`,
      name: "",
      description: "",
      price: 0,
      duration: "",
      features: [],
      active: true
    });
    setIsNewService(true);
    setShowEditDialog(true);
  };

  const handleSave = () => {
    if (isNewService) {
      setServices([...services, selectedService!]);
      toast({
        title: "Service Added",
        description: "New service has been added successfully.",
      });
    } else {
      setServices(services.map(s => s.id === selectedService?.id ? selectedService : s));
      toast({
        title: "Service Updated",
        description: "Service has been updated successfully.",
      });
    }
    setShowEditDialog(false);
  };

  const handleDelete = (serviceId: string) => {
    setServices(services.filter(s => s.id !== serviceId));
    toast({
      title: "Service Deleted",
      description: "Service has been removed.",
      variant: "destructive"
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Services Management</h2>
          <p className="text-muted-foreground">Manage your cleaning services and pricing</p>
        </div>
        <Button onClick={handleAddNew} style={{ background: 'linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)', color: 'white' }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Service
        </Button>
      </div>

      {/* Services Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <Card key={service.id} className="relative">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{service.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Price & Duration */}
              <div className="flex gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="font-bold text-lg">${service.price}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{service.duration}</span>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Features:</p>
                <ul className="space-y-1">
                  {service.features.slice(0, 3).map((feature, idx) => (
                    <li key={idx} className="text-xs flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                  {service.features.length > 3 && (
                    <li className="text-xs text-muted-foreground">
                      +{service.features.length - 3} more...
                    </li>
                  )}
                </ul>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleEdit(service)}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleDelete(service.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit/Add Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isNewService ? "Add New Service" : "Edit Service"}</DialogTitle>
            <DialogDescription>
              {isNewService ? "Create a new cleaning service" : "Update service details and pricing"}
            </DialogDescription>
          </DialogHeader>

          {selectedService && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Service Name</Label>
                  <Input
                    id="name"
                    value={selectedService.name}
                    onChange={(e) => setSelectedService({...selectedService, name: e.target.value})}
                    placeholder="e.g., Deep Cleaning"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration</Label>
                  <Input
                    id="duration"
                    value={selectedService.duration}
                    onChange={(e) => setSelectedService({...selectedService, duration: e.target.value})}
                    placeholder="e.g., 2-3 hours"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={selectedService.description}
                  onChange={(e) => setSelectedService({...selectedService, description: e.target.value})}
                  placeholder="Brief description of the service"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  value={selectedService.price}
                  onChange={(e) => setSelectedService({...selectedService, price: Number(e.target.value)})}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="features">Features (one per line)</Label>
                <Textarea
                  id="features"
                  value={selectedService.features.join('\n')}
                  onChange={(e) => setSelectedService({
                    ...selectedService, 
                    features: e.target.value.split('\n').filter(f => f.trim())
                  })}
                  placeholder="Dusting & vacuuming&#10;Bathroom cleaning&#10;Kitchen cleaning"
                  rows={6}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} style={{ background: 'linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)', color: 'white' }}>
              {isNewService ? "Add Service" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Services;
