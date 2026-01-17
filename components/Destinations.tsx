import React from 'react';
import DestinationCard from './DestinationCard';
import { DESTINATIONS } from '../constants';

interface DestinationsProps {
  t: (key: string) => string;
}

const Destinations: React.FC<DestinationsProps> = ({ t }) => {
  return (
    <section id="destinos" className="py-32 bg-slate-50 overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="text-center mb-24 max-w-4xl mx-auto">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="h-px w-8 bg-luxury-teal"></div>
            <p className="text-luxury-teal font-bold text-[10px] uppercase tracking-[0.5em]">Curated Selection</p>
            <div className="h-px w-8 bg-luxury-teal"></div>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold mb-8 text-slate-900 serif leading-tight">
            {t('dest.section_title')}
          </h2>
          <p className="text-slate-500 text-lg md:text-xl font-light leading-relaxed max-w-2xl mx-auto">
            {t('dest.section_subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {DESTINATIONS.map((dest) => (
            <div key={dest.id} className="reveal">
              <DestinationCard 
                destination={dest} 
                t={t}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Destinations;