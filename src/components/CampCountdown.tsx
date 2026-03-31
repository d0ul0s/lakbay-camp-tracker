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
    <div className="w-full animate-in fade-in zoom-in-95 duration-700">
      <div className={`relative overflow-hidden rounded-[32px] p-6 md:p-10 border shadow-sm transition-all ${
        phase === 'live' 
          ? 'bg-gradient-to-br from-brand-brown to-[#4d3227] border-brand-brown text-white shadow-xl shadow-brand-brown/20' 
          : 'bg-white border-brand-sand/20'
      }`}>
        {/* Background Decorative Element */}
        <div className={`absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full blur-[100px] opacity-10 pointer-events-none transition-colors ${
          phase === 'live' ? 'bg-brand-sand' : 'bg-brand-brown'
        }`} />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-2xl ${
                phase === 'live' ? 'bg-white/10 text-brand-sand' : 'bg-brand-sand/10 text-brand-brown'
              }`}>
                {phase === 'countdown' && <Timer size={24} />}
                {phase === 'live' && <Zap size={24} className="animate-pulse" />}
                {phase === 'post' && <Trophy size={24} />}
              </div>
              <h3 className={`text-[10px] md:text-sm font-black uppercase tracking-[0.3em] ${
                phase === 'live' ? 'text-brand-sand' : 'text-brand-brown/50'
              }`}>
                {phase === 'countdown' && "LAKBAY CAMP Begins In"}
                {phase === 'live' && "LAKBAY CAMP IS NOW LIVE!"}
                {phase === 'post' && "Time Since LAKBAY CAMP Concluded"}
              </h3>
            </div>
            <p className={`text-xl md:text-2xl font-bold leading-tight max-w-md ${phase === 'live' ? 'text-white' : 'text-brand-brown'}`}>
              {phase === 'countdown' && "Preparing for an unforgettable experience."}
              {phase === 'live' && "The fire has been lit. The camp is here."}
              {phase === 'post' && "The legacy continues. Keeping the fire burning."}
            </p>
          </div>

          {/* Timer Display */}
          <div className="flex items-center gap-2 md:gap-4 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            {[
              { label: 'Days', value: time.days },
              { label: 'Hrs', value: time.hours },
              { label: 'Min', value: time.minutes },
              { label: 'Sec', value: time.seconds }
            ].map((part, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <div className={`rounded-[24px] w-14 h-14 md:w-20 md:h-20 flex items-center justify-center shadow-inner ${
                  phase === 'live' ? 'bg-white/10 border border-white/5' : 'bg-brand-sand/5 border border-brand-sand/10'
                }`}>
                  <span className={`text-2xl md:text-4xl font-display tabular-nums leading-none tracking-tighter ${
                    phase === 'live' ? 'text-white' : 'text-brand-brown'
                  }`}>
                    {part.value.toString().padStart(2, '0')}
                  </span>
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest mt-3 ${
                  phase === 'live' ? 'text-white/40' : 'text-gray-400'
                }`}>{part.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
