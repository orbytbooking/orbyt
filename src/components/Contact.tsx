'use client'

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email address").max(255),
  phone: z.string().trim().min(1, "Phone number is required").max(20),
  message: z.string().trim().min(1, "Message is required").max(1000),
});

interface ContactProps {
  data?: {
    title?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
}

const Contact = ({ data }: ContactProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const title = data?.title || 'Contact Us';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      contactSchema.parse(formData);
      
      toast({
        title: "Message sent!",
        description: "We'll get back to you soon.",
      });
      
      setFormData({ name: "", email: "", phone: "", message: "" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    }
  };

  return (
    <section id="contact" className="py-16 bg-gray-50 relative">
      <div className="absolute top-0 right-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
      
      <div className="container mx-auto max-w-2xl relative z-10">
        <div className="text-center mb-12 animate-slide-up">
          <div className="inline-block px-6 py-2 bg-primary/10 rounded-full mb-4 border border-primary/20">
            <span className="text-primary font-semibold text-sm">CONNECT WITH US</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold">
            <span className="gradient-text">{title}</span>
          </h2>
          {(data?.email || data?.phone || data?.address) && (
            <div className="mt-6 space-y-2 text-center">
              {data.email && <p className="text-muted-foreground">Email: {data.email}</p>}
              {data.phone && <p className="text-muted-foreground">Phone: {data.phone}</p>}
              {data.address && <p className="text-muted-foreground">Address: {data.address}</p>}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-card p-10 rounded-3xl card-shadow hover:shadow-2xl transition-shadow border border-primary/10 animate-scale-in gradient-card">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter your name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Enter email address"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone No.</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Enter phone number"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Message"
              rows={5}
              required
            />
          </div>

          <Button type="submit" className="w-full gradient-primary hover:scale-105 transition-transform shadow-lg" size="lg">
            Submit Message
          </Button>
        </form>
      </div>
    </section>
  );
};

export default Contact;
