import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import Services from "@/components/Services";
import Reviews from "@/components/Reviews";
import Referral from "@/components/Referral";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <main>
        <Hero />
        <HowItWorks />
        <Services />
        <Reviews />
        <Referral />
        <Contact />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
