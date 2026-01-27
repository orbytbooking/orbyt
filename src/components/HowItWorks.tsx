import { Calendar, CheckCircle, Smile } from "lucide-react";

const defaultSteps = [
  {
    title: "Book Appointment",
    description: "Use our simple platform to book an appointment with verified top providers.",
    icon: Calendar,
    image: "/images/book-appointment.jpg",
  },
  {
    title: "Get Confirmation",
    description: "You will receive a confirmation from us when your appointment is confirmed.",
    icon: CheckCircle,
    image: "/images/get-confirmation.jpg",
  },
  {
    title: "Relax, Sit Done!",
    description: "You are all set to see your top provider. Don't stress, we got you covered.",
    icon: Smile,
    image: "/images/relax-sit-done.jpg",
  },
];

interface HowItWorksProps {
  data?: {
    title?: string;
    steps?: Array<{
      title: string;
      description: string;
      image: string;
    }>;
  };
}

export default function HowItWorks({ data }: HowItWorksProps) {
  const steps = data?.steps || defaultSteps;
  const title = data?.title || 'How It Works?';
  return (
    <section id="how-it-works" className="py-16 bg-gradient-to-b from-white to-gray-50">
      <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
      
      <div className="container mx-auto relative z-10">
        <div className="text-center mb-16 animate-slide-up">
          <div className="inline-block px-6 py-2 bg-primary/10 rounded-full mb-4 border border-primary/20">
            <span className="text-primary font-semibold text-sm">SIMPLE PROCESS</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            {title.includes('?') ? title : `${title}?`}
          </h2>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {steps.map((step, index) => {
            const icons = [Calendar, CheckCircle, Smile];
            const Icon = icons[index] || Calendar;
            return (
              <div 
                key={index}
                className="group relative bg-card rounded-2xl overflow-hidden card-shadow hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 animate-scale-in border border-primary/10"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="absolute top-4 right-4 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xl border-2 border-primary/20 z-10">
                  {index + 1}
                </div>
                <div className="aspect-square overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <img 
                    src={step.image} 
                    alt={step.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
                <div className="p-6 text-center gradient-card">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4 group-hover:glow-effect transition-all group-hover:bg-primary/20 border border-primary/20">
                    <Icon className="w-7 h-7 text-primary group-hover:scale-110 transition-transform" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
