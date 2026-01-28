'use client'

import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Shield, Clock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

interface HeroProps {
  data?: {
    title?: string;
    subtitle?: string;
    description?: string;
    backgroundImage?: string;
    button1Text?: string;
    button1Link?: string;
    button2Text?: string;
    button2Link?: string;
  };
  branding?: {
    primaryColor?: string;
    companyName?: string;
  };
}

const Hero = ({ 
  data = {
    title: 'Thanks For Stopping By',
    subtitle: 'Let Us Connect You With Top Providers',
    description: 'Experience hassle-free booking with instant confirmation, vetted professionals, and premium service quality.',
    backgroundImage: '/images/hero-background-chicago.png',
    button1Text: 'Book Appointment',
    button1Link: '/book-now',
    button2Text: 'Contact Us',
    button2Link: '#contact',
  },
  branding
}: HeroProps) => {
  const router = useRouter();
  const [isCustomerAuthenticated, setIsCustomerAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuthState = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('auth_user_id', session.user.id)
          .single();
        
        setIsCustomerAuthenticated(!!customer);
      } else {
        setIsCustomerAuthenticated(false);
      }
    };

    checkAuthState();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setIsCustomerAuthenticated(false);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        checkAuthState();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleBookNowClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isCustomerAuthenticated) {
      router.push("/customer/dashboard");
    } else {
      router.push("/login");
    }
  };
  return (
    <section 
      id="home"
      className="relative pt-20 pb-16 px-4 min-h-screen flex items-center overflow-hidden"
      style={{
        backgroundImage: `url(${data.backgroundImage || '/images/hero-background-chicago.png'})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      
      <div className="container mx-auto relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Trust badges - Centered */}
          <div className="flex flex-wrap justify-center gap-6 mb-8 animate-slide-up">
            <div className="flex items-center gap-2 px-4 py-2 glass-effect rounded-full bg-white/90">
              <Shield className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-gray-900">Trusted Professionals</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 glass-effect rounded-full bg-white/90">
              <Clock className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-gray-900">24/7 Support</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 glass-effect rounded-full bg-white/90">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-gray-900">Premium Service</span>
            </div>
          </div>

          {/* Centered content */}
          <div className="flex justify-center items-center">
            {/* Text content - Centered */}
            <div className="text-center animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="mb-6">
                <span className="px-6 py-3 bg-white/95 border-2 border-primary rounded-full text-primary font-semibold text-sm tracking-wider shadow-lg">
                  CHICAGO'S #1 CLEANING SERVICE
                </span>
              </div>
              
              <h1 className="text-6xl md:text-7xl lg:text-8xl font-sans font-extrabold mb-6 leading-tight">
                {data.title?.split('\n').map((line, i) => (
                  <span key={i} className="block text-primary drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
                    {line}
                  </span>
                )) || (
                  <>
                    <span className="block text-primary drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
                      Thanks For
                    </span>
                    <span className="block text-primary drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
                      Stopping By
                    </span>
                  </>
                )}
              </h1>
              
              <p className="text-xl md:text-2xl text-navy mb-4 font-bold drop-shadow-[0_2px_8px_rgba(255,255,255,0.8)]">
                {data.subtitle || 'Let Us Connect You With Top Providers'}
              </p>
              
              <p className="text-base md:text-lg text-white/95 mb-10 font-semibold drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] max-w-3xl mx-auto">
                {data.description || 'Experience hassle-free booking with instant confirmation, vetted professionals, and premium service quality.'}
              </p>
              
              <div className="flex flex-col sm:flex-row justify-center gap-5 mb-12">
                <Button 
                  size="lg" 
                  className="text-lg px-10 py-6 gradient-primary hover:scale-105 transition-all shadow-xl hover:shadow-2xl rounded-full group"
                  onClick={handleBookNowClick}
                >
                  {data.button1Text || 'Book Appointment'}
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button 
                  asChild
                  size="lg" 
                  variant="outline" 
                  className="text-lg px-10 py-6 border-2 border-primary/30 hover:border-primary hover:bg-primary/10 hover:scale-105 transition-all rounded-full backdrop-blur-sm"
                >
                  <a href={data.button2Link || '#contact'}>
                    {data.button2Text || 'Contact Us'}
                  </a>
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-primary/40 max-w-2xl mx-auto">
                <div className="animate-scale-in" style={{ animationDelay: '0.2s' }}>
                  <div className="text-3xl md:text-4xl font-bold text-primary drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] mb-2">10K+</div>
                  <div className="text-xs md:text-sm text-navy font-bold drop-shadow-[0_2px_6px_rgba(255,255,255,0.8)] bg-white/90 px-3 py-1 rounded-full inline-block">Happy Clients</div>
                </div>
                <div className="animate-scale-in" style={{ animationDelay: '0.3s' }}>
                  <div className="text-3xl md:text-4xl font-bold text-primary drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] mb-2">500+</div>
                  <div className="text-xs md:text-sm text-navy font-bold drop-shadow-[0_2px_6px_rgba(255,255,255,0.8)] bg-white/90 px-3 py-1 rounded-full inline-block">Pro Cleaners</div>
                </div>
                <div className="animate-scale-in" style={{ animationDelay: '0.4s' }}>
                  <div className="text-3xl md:text-4xl font-bold text-primary drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] mb-2">4.9★</div>
                  <div className="text-xs md:text-sm text-navy font-bold drop-shadow-[0_2px_6px_rgba(255,255,255,0.8)] bg-white/90 px-3 py-1 rounded-full inline-block">Rating</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
