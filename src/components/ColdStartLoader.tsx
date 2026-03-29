import { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import api from '../api/axios';
import { Loader2 } from 'lucide-react';

export default function ColdStartLoader() {
  const { isServerAwake, setServerAwake } = useAppStore();
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (isServerAwake) {
      setHasError(false);
      return;
    }

    let isMounted = true;
    let timeoutId: NodeJS.Timeout;
    const maxWaitTime = 60000;
    const startTime = Date.now();

    const checkHealth = async () => {
      if (!isMounted) return;

      try {
        await api.get('/api/health', { 
          timeout: 5000,
          validateStatus: (status) => status === 200 || status === 503
        });
        
        // If we get here, the server successfully responded with our code.
        setServerAwake(true);
      } catch (err) {
        if (Date.now() - startTime > maxWaitTime) {
          setHasError(true);
        } else {
          timeoutId = setTimeout(checkHealth, 3000);
        }
      }
    };

    checkHealth();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [isServerAwake, setServerAwake]);

  if (isServerAwake) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-50/95 backdrop-blur-sm">
      <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center max-w-sm mx-4 text-center border border-gray-100">
        {hasError ? (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6 text-red-600">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Server Timeout</h3>
            <p className="text-gray-600 mb-6">The server is still starting. Please refresh in a moment to try again.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-brand-brown text-white rounded-lg font-medium hover:bg-brand-light-brown transition shadow-sm"
            >
              Refresh Page
            </button>
          </>
        ) : (
          <>
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-brand-sand/20 rounded-full blur-xl opacity-50 animate-pulse"></div>
              <Loader2 className="w-16 h-16 text-brand-brown animate-spin relative z-10" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3 tracking-wide font-display">Waking up the server...</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              This may take <span className="font-semibold text-gray-800">10 to 60 seconds</span> on the free plan.<br />
              Please stay on this page.
              The backend can sleep when unused on free tiers, so the first request after inactivity may take a long time.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
