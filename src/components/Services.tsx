import { Clock, Shield, CreditCard, DollarSign, MessageCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const services = [
  {
    title: "Save Your Time",
    description: "Save time by booking online",
    icon: Clock,
  },
  {
    title: "Safety First",
    description: "Engage in friendly environments",
    icon: Shield,
  },
  {
    title: "Only Best Quality",
    description: "We have screened for quality",
    icon: Zap,
  },
  {
    title: "Easy To Get Help",
    description: "One click to help is all you need",
    icon: MessageCircle,
  },
  {
    title: "Seamless Communication",
    description: "Payment and billing made simple",
    icon: MessageCircle,
  },
  {
    title: "Cash Free Payment",
    description: "Contactless is safer with mobile access",
    icon: CreditCard,
  },
];

const Services = () => {
  return (
    <section id="services" className="py-24 px-4 relative overflow-hidden bg-gradient-to-b from-background to-muted/30">
      <div className="absolute inset-0 pattern-grid opacity-20" />
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
      
      <div className="container mx-auto relative z-10">
        <div className="text-center mb-20 animate-slide-up">
          <div className="inline-block px-8 py-3 bg-primary/10 rounded-full mb-6 border-2 border-primary/20 animate-pulse-glow">
            <span className="text-primary font-bold text-sm tracking-widest">WHAT WE OFFER</span>
          </div>
          <h2 className="text-5xl md:text-6xl font-serif font-bold mb-6">
            Our <span className="text-gradient">Premium Services</span>
          </h2>
          <p className="text-muted-foreground text-xl max-w-2xl mx-auto leading-relaxed">
            Everything you need for a seamless booking experience with top-rated professionals
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto mb-16">
          {services.map((service, index) => (
            <div
              key={index}
              className="group p-8 rounded-3xl bg-card border-2 border-primary/10 card-shadow hover-lift animate-scale-in relative overflow-hidden"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Hover gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative z-10">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 mb-6 border-2 border-primary/30 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 animate-pulse-glow">
                  <service.icon className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-4 group-hover:text-primary transition-colors">{service.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-base">{service.description}</p>
                
                {/* Decorative corner */}
                <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-primary/20 rounded-tr-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ))}
        </div>

        {/* Call to action */}
        <div className="text-center animate-slide-up mt-16">
          <p className="text-muted-foreground mb-6 text-lg">
            Need something else? We're here to help!
          </p>
          <Button size="lg" variant="outline" className="border-2 border-primary/30 hover:border-primary hover:bg-primary/10 px-8 rounded-full">
            View All Services
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Services;
