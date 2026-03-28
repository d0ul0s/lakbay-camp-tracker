import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react';

export default function ErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  let errorMessage = "An unexpected error occurred.";
  let errorDetail = "";

  if (isRouteErrorResponse(error)) {
    errorMessage = `${error.status} ${error.statusText}`;
    errorDetail = error.data?.message || error.data || "";
  } else if (error instanceof Error) {
    errorMessage = error.message;
    errorDetail = error.stack || "";
  }

  return (
    <div className="min-h-screen bg-brand-cream/30 flex items-center justify-center p-4 md:p-8 font-sans">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-brand-beige animate-in fade-in zoom-in duration-300">
        <div className="bg-red-50 p-6 md:p-8 flex items-center gap-4 md:gap-6 border-b border-red-100">
          <div className="p-3 bg-red-100 text-red-600 rounded-2xl shadow-inner">
            <AlertTriangle size={32} className="md:w-10 md:h-10" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-display text-red-900 leading-tight">Unexpected Application Error</h1>
            <p className="text-red-700/70 font-medium mt-1">LAKBAY Tracker has encountered an issue.</p>
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-6">
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <ShieldAlert size={12} /> Error Diagnostics
            </h2>
            <p className="text-brand-brown font-bold text-lg leading-snug">{errorMessage}</p>
            {errorDetail && (
              <details className="mt-3 group">
                <summary className="text-xs text-gray-400 cursor-pointer hover:text-brand-brown transition-colors list-none flex items-center gap-1 font-bold uppercase tracking-tighter">
                  View Technical Details 
                  <span className="group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <pre className="mt-2 text-[10px] bg-white p-3 rounded-xl border border-gray-100 overflow-x-auto text-gray-500 font-mono leading-relaxed max-h-40 overflow-y-auto custom-scrollbar">
                  {errorDetail}
                </pre>
              </details>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => window.location.reload()}
              className="group flex items-center justify-center gap-2 bg-brand-brown text-white py-4 px-6 rounded-2xl font-bold hover:bg-brand-light-brown transition-all shadow-lg hover:shadow-brand-brown/20 active:scale-[0.98]"
            >
              <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
              Reload Application
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex items-center justify-center gap-2 bg-white text-gray-600 py-4 px-6 rounded-2xl font-bold border border-gray-200 hover:bg-gray-50 transition-all active:scale-[0.98]"
            >
              <Home size={18} />
              Return to Dashboard
            </button>
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-center gap-4 opacity-40 grayscale group hover:grayscale-0 transition-all duration-700">
             <img src="https://gemini-antigravity.vercel.app/lakbay-logo.png" alt="LAKBAY" className="h-6 w-auto" />
             <div className="h-4 w-[1px] bg-gray-300"></div>
             <p className="text-[10px] font-black tracking-widest text-gray-400 uppercase">Resilience Mode Active</p>
          </div>
        </div>
      </div>
    </div>
  );
}
