import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAppStore } from '../store';

export default function Login() {
  console.log(import.meta.env.VITE_API_URL);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const login = useAppStore(state => state.login);
  const setLoading = useAppStore(state => state.setLoading);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/login`, { pin });
      login(res.data);
      localStorage.setItem("token", res.data.token);
      navigate('/');
    } catch (err) {
      console.error(err);
      setError(true);
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-brand-beige">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-display text-brand-brown">LAKBAY</h1>
          <p className="text-brand-light-brown mt-2 font-medium">Summer Youth Camp 2026</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-brand-brown mb-2 text-center">Enter Access PIN</label>
            <input
              type="password"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError(false);
              }}
              className="w-full px-4 py-3 rounded-lg border-2 border-brand-sand focus:ring-0 focus:border-brand-brown outline-none transition-all text-center text-3xl tracking-[0.5em] font-mono"
              placeholder="••••"
              maxLength={4}
            />
            {error && <p className="text-red-500 text-sm mt-3 text-center font-medium">Invalid PIN code. Please try again.</p>}
          </div>
          <button
            type="submit"
            className="w-full bg-brand-brown hover:bg-brand-light-brown text-white font-bold py-3 px-4 rounded-lg transition-colors text-lg shadow-md"
          >
            Enter Portal
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-brand-beige text-center text-sm text-gray-500">
          <p>For authorized camp personnel only. If you are not a camp staff, please ask for assistance from your Youth Church leader.</p>
        </div>
      </div>
    </div>
  );
}
