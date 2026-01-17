import React, { useState, useRef } from 'react';
import { PREMIER_SERVICES, TEAM, ROADMAP, TRANSLATIONS, PARTNERS, INVESTOR_ASSETS } from '../constants';
import { Language } from '../types';

interface InvestorsProps {
  t: (key: string) => any;
  lang: Language;
}

interface InvestorAsset {
  id: string;
  name: string;
  type: 'pdf' | 'mp4';
  url: string;
  thumbnail?: string;
  fileSize?: string;
}

const Investors: React.FC<InvestorsProps> = ({ t, lang }) => {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [assets, setAssets] = useState<InvestorAsset[]>(INVESTOR_ASSETS as InvestorAsset[]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isVideo = file.type.includes('video');
      const newAsset: InvestorAsset = {
        id: Date.now().toString(),
        name: file.name,
        type: isVideo ? 'mp4' : 'pdf',
        url: URL.createObjectURL(file),
        fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        thumbnail: isVideo ? 'https://images.unsplash.com/photo-1583000292278-5951f3387e33?auto=format&fit=crop&q=80&w=800' : undefined
      };
      setAssets([...assets, newAsset]);
    }
  };

  const pdfs = assets.filter(a => a.type === 'pdf');
  const videos = assets.filter(a => a.type === 'mp4');

  return (
    <section id="inversionistas" className="py-32 bg-[#1a2e35] text-white reveal">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-end mb-24 gap-12">
          <div className="max-w-2xl">
            <div className="flex items-center space-x-3 mb-6">
              <div className="h-px w-8 bg-luxury-teal"></div>
              <p className="text-luxury-teal font-bold text-[10px] uppercase tracking-[0.5em]">Exclusive Investor Access</p>
            </div>
            <h2 className="text-4xl md:text-6xl font-bold mb-8 serif italic">{t('investors.title')}</h2>
            <p className="text-white/40 text-xl font-light">{t('investors.subtitle')}</p>
          </div>
          <button
            onClick={() => setIsAdminMode(!isAdminMode)}
            className="px-8 py-3 border border-white/10 rounded-full text-[10px] font-bold tracking-widest uppercase hover:bg-white hover:text-slate-900 transition-all active:scale-95"
          >
            {isAdminMode ? 'Exit Management' : 'Manage Assets'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
          {/* Documents Section */}
          <div className="space-y-12">
            <h3 className="text-xs font-bold uppercase tracking-[0.4em] text-white/30 border-b border-white/5 pb-6">
              {t('investors.documents')}
            </h3>
            <div className="grid gap-6">
              {pdfs.map(doc => (
                <div key={doc.id} className="group flex items-center justify-between p-8 bg-white/5 rounded-3xl border border-white/5 hover:border-luxury-teal/30 hover:bg-white/10 transition-all">
                  <div className="flex items-center space-x-6">
                    <div className="w-14 h-14 rounded-2xl bg-luxury-teal/10 flex items-center justify-center text-luxury-teal">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold tracking-wide">{doc.name}</p>
                      <p className="text-[10px] uppercase tracking-widest text-white/20 mt-1">PDF Document • {doc.fileSize}</p>
                    </div>
                  </div>
                  <a
                    href={doc.url}
                    download={doc.name}
                    className="p-4 rounded-full bg-white/5 hover:bg-luxury-teal hover:text-white transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Presentations Section */}
          <div className="space-y-12">
            <h3 className="text-xs font-bold uppercase tracking-[0.4em] text-white/30 border-b border-white/5 pb-6">
              {t('investors.presentations')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {videos.map(video => (
                <div key={video.id} className="group space-y-4">
                  <div className="relative aspect-video rounded-[2rem] overflow-hidden bg-black shadow-2xl border border-white/5">
                    <video
                      src={video.url}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                      controls
                      poster={video.thumbnail}
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:scale-110 transition-transform">
                      <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                    {/* Download Overlay for Videos */}
                    <a
                      href={video.url}
                      download={video.name}
                      className="absolute top-4 right-4 p-3 bg-black/40 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </a>
                  </div>
                  <div className="px-2">
                    <p className="text-sm font-bold serif group-hover:text-luxury-teal transition-colors">{video.name}</p>
                    <p className="text-[10px] text-white/20 uppercase tracking-widest mt-1">MP4 Presentation • {video.fileSize}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Management Panel (Protected UI) */}
        {isAdminMode && (
          <div className="mt-24 p-12 bg-white/5 border border-white/10 rounded-[3rem] animate-fade-in">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-luxury-teal/20 flex items-center justify-center text-luxury-teal mb-8">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h4 className="text-2xl font-bold mb-4 serif">Asset Management Portal</h4>
              <p className="text-white/40 mb-10 max-w-md">Upload new PDFs (MOU/Financials) or MP4 presentations. Changes will reflect immediately for VIP access.</p>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.mp4"
              />

              <button
                onClick={handleUploadClick}
                className="group relative bg-luxury-teal text-white px-12 py-5 rounded-full text-xs font-bold tracking-[0.2em] hover:brightness-110 transition-all hover:shadow-[0_20px_50px_rgba(0,168,181,0.3)] active:scale-95 uppercase overflow-hidden"
              >
                Select Files to Upload
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default Investors;