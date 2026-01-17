
import React from 'react';

const Hero: React.FC = () => {
  return (
    <section className="relative h-screen w-full flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&q=80&w=2000" 
          alt="Caribbean Island" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 text-center text-white max-w-5xl">
        <h1 className="text-5xl md:text-7xl lg:text-8xl mb-6 leading-tight animate-fade-in-up">
          Descubra el Caribe Colombiano con un Lujo Incomparable
        </h1>
        <p className="text-lg md:text-xl mb-10 text-white/90 max-w-3xl mx-auto font-light leading-relaxed">
          Como una empresa data-driven y pionera en IA, nos especializamos en crear experiencias de viaje a medida, 
          ofreciendo acceso exclusivo a islas privadas, villas de lujo y yates.
        </p>
        <button className="bg-luxury-teal text-white px-10 py-4 rounded-sm text-lg font-bold tracking-widest hover:brightness-110 transition-all hover:shadow-xl active:scale-95 uppercase">
          Empieza a Planificar
        </button>
      </div>
      
      {/* Floating Indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </section>
  );
};

export default Hero;
