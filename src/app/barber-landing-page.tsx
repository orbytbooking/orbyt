import { industryDetails, servicesByIndustry } from "./barber-landing-data";
import { Home, Scissors } from 'lucide-react';

export default function BarberLandingPage() {
  const barberIndustry = "barber";
  const details = industryDetails[barberIndustry];
  const services = servicesByIndustry[barberIndustry];

  return (
    <main className="min-h-screen flex flex-col bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Scissors className="h-9 w-9 text-cyan-600" />
            <div className="flex flex-col">
              <span className="text-base font-bold text-slate-900 tracking-wide">
                Orbyt Barber Booking
              </span>
            </div>
          </div>
        </div>
      </header>
      <section className="flex flex-col items-center justify-center py-32 bg-gradient-to-b from-cyan-50 to-white">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center">Book Your Next Barber Appointment</h1>
        <p className="text-lg text-slate-600 mb-8 text-center max-w-2xl">{details.description}</p>
        <a href="/book-now?industry=barber" className="px-8 py-4 bg-cyan-600 text-white rounded-full text-lg font-semibold shadow hover:bg-cyan-700 transition">Book Now</a>
      </section>
      <section className="container mx-auto py-16">
        <h2 className="text-3xl font-bold mb-8 text-center">Our Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {services.map((service) => (
            <div key={service.id} className="rounded-xl border p-6 shadow hover:shadow-lg transition bg-white flex flex-col items-center">
              <img src={service.image} alt={service.name} className="w-full h-40 object-cover rounded-lg mb-4" />
              <h3 className="text-xl font-semibold mb-2">{service.name}</h3>
              <p className="text-slate-600 mb-2 text-center">{service.description}</p>
              <ul className="mb-2 text-sm text-slate-500 list-disc list-inside">
                {service.features?.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
              <div className="mt-auto">
                <span className="text-cyan-700 font-bold text-lg">${service.price}</span>
                <span className="ml-2 text-slate-400 text-sm">({service.duration})</span>
              </div>
            </div>
          ))}
        </div>
      </section>
      <footer className="py-8 text-center text-slate-400">
        &copy; {new Date().getFullYear()} Orbyt Barber Booking. All rights reserved.
      </footer>
    </main>
  );
}
