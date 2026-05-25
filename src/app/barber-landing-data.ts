import { Home, Scissors } from 'lucide-react';

export const industryDetails: Record<string, { description: string; Icon: any }> = {
  "home-cleaning": {
    description: "Professional cleaning services for your home including standard, deep, and move in/out cleaning.",
    Icon: Home,
  },
  "barber": {
    description: "Barber services including haircuts, beard trims, shaves, and grooming packages.",
    Icon: Scissors,
  },
};

export const servicesByIndustry: Record<string, Array<{
  id: string;
  name: string;
  description: string;
  price: number;
  duration: string;
  image: string;
  features?: string[];
}>> = {
  "home-cleaning": [
    // ...existing home cleaning services...
  ],
  "barber": [
    {
      id: "haircut",
      name: "Haircut",
      description: "Precision haircut tailored to your style by an expert barber.",
      price: 35,
      duration: "30-45 min",
      image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=300&fit=crop",
      features: ["Consultation", "Wash & style", "Finishing products"],
    },
    {
      id: "beard-trim",
      name: "Beard Trim",
      description: "Expert beard shaping and maintenance for a sharp look.",
      price: 20,
      duration: "15-20 min",
      image: "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=400&h=300&fit=crop",
      features: ["Line-up", "Trimming", "Hot towel finish"],
    },
    {
      id: "shave",
      name: "Hot Towel Shave",
      description: "Traditional straight razor shave with hot towel treatment.",
      price: 30,
      duration: "25-35 min",
      image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&h=300&fit=crop",
      features: ["Pre-shave oil", "Hot towel", "Aftershave balm"],
    },
    {
      id: "bundle",
      name: "Cut + Beard Bundle",
      description: "Get a haircut and beard trim together for a complete look.",
      price: 50,
      duration: "50-60 min",
      image: "https://images.unsplash.com/photo-1520880867055-1e30d1cb001c?w=400&h=300&fit=crop",
      features: ["Haircut", "Beard trim", "Style & finish"],
    },
  ],
};
