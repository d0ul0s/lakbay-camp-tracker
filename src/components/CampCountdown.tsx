import { useState, useEffect } from 'react';
import { Timer, Zap, Trophy } from 'lucide-react';

const START_DATE = new Date('2026-04-08T15:00:00+08:00');
const END_DATE = new Date('2026-04-12T00:00:00+08:00');

export default function CampCountdown() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getPhase = () => {
    if (now < START_DATE) return 'countdown';
    if (now < END_DATE) return 'live';
    return 'post';
  };

  const getTimeParts = (target: Date, isPast: boolean = false) => {
    const diff = isPast 
      ? now.getTime() - target.getTime() 
      : target.getTime() - now.getTime();
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    return {
      days: Math.max(0, days),
      hours: Math.max(0, hours % 24),
      minutes: Math.max(0, minutes % 60),
      seconds: Math.max(0, seconds % 60)
    };
  };

  const phase = getPhase();
  const time = (phase === 'countdown' || phase === 'post' || phase === 'live')
    ? getTimeParts(phase === 'countdown' ? START_DATE : (phase === 'post' ? END_DATE : START_DATE), phase !== 'countdown')
    : { days: 0, hours: 0, minutes: 0, seconds: 0 };

  return (
    <div className="w-full animate-in fade-in slide-in-from-top-4 duration-700">
      <div className={`relative overflow-hidden rounded-2xl md:rounded-full px-4 py-2.5 md:py-3 border shadow-lg transition-all ${
        phase === 'live' 
          ? 'bg-brand-brown border-brand-brown text-white ring-2 ring-brand-sand/20' 
          : 'bg-white/80 backdrop-blur-md border-white/50'
      }`}>
        {/* Subtle Pulse Decor */}
        {phase === 'live' && (
            <div className="absolute inset-0 bg-brand-sand/5 animate-pulse pointer-events-none"></div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          {/* Status Badge */}
          <div className="flex items-center gap-2.5">
            <div className={`flex items-center justify-center shrink-0 w-7 h-7 rounded-lg ${
              phase === 'live' ? 'bg-white/10 text-brand-sand' : 'bg-brand-sand/10 text-brand-brown'
            }`}>
              {phase === 'countdown' && <Timer size={14} />}
              {phase === 'live' && <Zap size={14} className="animate-pulse" />}
              {phase === 'post' && <Trophy size={14} />}
            </div>
            <div className="min-w-0">
               <h3 className={`text-[9px] font-black uppercase tracking-[0.2em] leading-none ${
                 phase === 'live' ? 'text-brand-sand' : 'text-brand-brown/40'
               }`}>
                 {phase === 'countdown' && "LAKBAY Begins In"}
                 {phase === 'live' && "LAKBAY IS LIVE!"}
                 {phase === 'post' && "Legacy Continued"}
               </h3>
               {/* Compact description (Single line only) */}
               <p className={`text-[10px] font-bold truncate mt-0.5 ${phase === 'live' ? 'text-white/80' : 'text-brand-brown/70'}`}>
                 {phase === 'countdown' && "The countdown to fire."}
                 {phase === 'live' && "The flame is lit."}
                 {phase === 'post' && "Keeping the fire burning."}
               </p>
            </div>
          </div>

          {/* Compact Ticker Timer */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {[
              { label: 'd', value: time.days },
              { label: 'h', value: time.hours },
              { label: 'm', value: time.minutes },
              { label: 's', value: time.seconds }
            ].map((part, idx) => (
              <div key={idx} className="flex items-baseline gap-0.5">
                <span className={`text-lg md:text-xl font-display tabular-nums leading-none tracking-tighter ${
                  phase === 'live' ? 'text-white' : 'text-brand-brown'
                }`}>
                  {part.value.toString().padStart(2, '0')}
                </span>
                <span className={`text-[8px] font-black uppercase tracking-tighter self-end mb-0.5 ${
                  phase === 'live' ? 'text-white/40' : 'text-brand-brown/20'
                }`}>{part.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
