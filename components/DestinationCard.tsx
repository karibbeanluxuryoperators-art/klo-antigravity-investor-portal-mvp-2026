import React, { useState } from 'react';
import { Destination } from '../types';

interface DestinationCardProps {
  destination: Destination;
  t: (key: string) => string;
}

const DestinationCard: React.FC<DestinationCardProps> = ({ destination, t }) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Función para obtener imagen de placeholder si falla la original
  const getImageSrc = () => {
    if (imageError) {
      // Placeholder con el nombre del destino
      const destinationName = t(destination.titleKey);
      return `https://placehold.co/800x600/0f766e/ffffff?text=${encodeURIComponent(destinationName)}`;
    }
    
    // Si la URL original es de un dominio roto, usar placeholder directamente
    if (destination.imageUrl?.includes('netjets.com') || 
        destination.imageUrl?.includes('flapz.app') ||
        !destination.imageUrl) {
      return `https://placehold.co/800x600/0f766e/ffffff?text=${encodeURIComponent(t(destination.titleKey))}`;
    }
    
    return destination.imageUrl;
  };

  return (
    <div className="group relative bg-white rounded-lg shadow-sm hover:shadow-2xl transition-all duration-700 overflow-hidden flex flex-col h-full border border-slate-100">
      <div className="relative h-72 overflow-hidden bg-slate-100">
        {/* Loading skeleton */}
        {isLoading && (
          <div className="absolute inset-0 bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 animate-pulse"></div>
        )}
        
        <img 
          src={getImageSrc()}
          alt={t(destination.titleKey)} 
          className={`w-full h-full object-cover transition-all duration-[1.5s] group-hover:scale-110 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setImageError(true);
            setIsLoading(false);
          }}
        />
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-all duration-500"></div>
      </div>
      
      <div className="p-10 flex flex-col flex-grow">
        <h3 className="text-2xl font-bold mb-4 text-slate-900 serif">{t(destination.titleKey)}</h3>
        <p className="text-slate-500 text-sm leading-relaxed mb-8 font-light">
          {t(destination.descriptionKey)}
        </p>
        
        <div className="mt-auto flex items-center justify-between">
          <a 
            href={destination.externalLink || `#${destination.id}`} 
            target={destination.externalLink ? "_blank" : undefined}
            rel={destination.externalLink ? "noopener noreferrer" : undefined}
            className="inline-flex items-center text-luxury-teal font-bold text-[10px] tracking-[0.2em] group uppercase transition-all"
          >
            EXPLORE
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-4 w-4 ml-3 transition-transform group-hover:translate-x-2" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
          
          <button 
            onClick={() => {
              const assistantBtn = document.querySelector('button[class*="rounded-[2rem]"]') as HTMLButtonElement;
              if (assistantBtn) assistantBtn.click();
              setTimeout(() => {
                const input = document.querySelector('input[placeholder*="Talk to"]') as HTMLInputElement;
                if (input) {
                  input.value = `Tell me about luxury spots and restaurants near ${t(destination.titleKey)}`;
                  const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
                  input.dispatchEvent(enterEvent);
                }
              }, 100);
            }}
            className="p-3 bg-slate-50 rounded-full text-luxury-teal hover:bg-luxury-teal hover:text-white transition-all shadow-sm group/map"
            title="Find nearby luxury venues"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transition-transform group-hover/map:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DestinationCard;
