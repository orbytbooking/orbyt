import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

const Referral = () => {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
      <div className="absolute inset-0 pattern-dots opacity-20" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl animate-gradient-shift" />
      
      <div className="container mx-auto max-w-5xl text-center relative z-10">
        <div className="animate-slide-up bg-card/80 backdrop-blur-xl border-2 border-primary/30 rounded-[2rem] p-12 md:p-16 card-shadow hover:shadow-2xl transition-all relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-40 h-40 bg-accent/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
          
          <div className="relative z-10">
            <div className="inline-block px-8 py-3 bg-primary/10 rounded-full mb-8 border-2 border-primary/20 animate-shimmer">
              <span className="text-primary font-bold text-sm tracking-widest">REFERRAL PROGRAM</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold mb-8 leading-tight">
              Refer Your Friends And <br/>
              <span className="text-gradient">Earn Big Rewards</span>
            </h2>
            
            <p className="text-muted-foreground text-lg mb-10 max-w-2xl mx-auto">
              Share the love and get rewarded! For every friend you refer, you both earn credits towards your next service.
            </p>
            
            <div className="inline-flex items-center justify-center w-28 h-28 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 mb-10 animate-float border-2 border-primary/30 shadow-2xl">
              <Users className="w-14 h-14 text-primary drop-shadow-lg" />
            </div>
            
            <div className="mb-10 bg-gradient-to-r from-primary/20 via-accent/10 to-primary/20 rounded-3xl p-10 border-2 border-primary/30 animate-gradient-shift relative overflow-hidden">
              <div className="absolute inset-0 animate-shimmer" />
              <p className="text-7xl md:text-8xl font-black text-gradient mb-3 relative z-10 drop-shadow-lg font-serif">
                $50 + $50
              </p>
              <p className="text-muted-foreground text-xl font-medium relative z-10">
                Referral reward credits for both of you
              </p>
            </div>

            {/* Benefits */}
            <div className="grid md:grid-cols-3 gap-6 mb-10 text-left">
              <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20">
                <div className="text-3xl mb-2">🎁</div>
                <h4 className="font-bold mb-2">Instant Credits</h4>
                <p className="text-sm text-muted-foreground">Credits applied immediately after first booking</p>
              </div>
              <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20">
                <div className="text-3xl mb-2">♾️</div>
                <h4 className="font-bold mb-2">Unlimited Referrals</h4>
                <p className="text-sm text-muted-foreground">Refer as many friends as you want</p>
              </div>
              <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20">
                <div className="text-3xl mb-2">💰</div>
                <h4 className="font-bold mb-2">Stack Rewards</h4>
                <p className="text-sm text-muted-foreground">Combine credits for bigger savings</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-lg px-12 py-6 gradient-primary hover:scale-105 transition-all shadow-xl hover:shadow-2xl rounded-full group">
                Share Your Link
                <Users className="ml-2 h-5 w-5 group-hover:rotate-12 transition-transform" />
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-12 py-6 border-2 border-primary/30 hover:border-primary hover:bg-primary/10 rounded-full">
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Referral;
