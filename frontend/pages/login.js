import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, googleLogin } = useAuth();
  const router = useRouter();

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await googleLogin();
      toast.success("Welcome to QCU Marketplace!");
    } catch (error) {
      console.error(error);
      toast.error("Google Login failed. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Login Successful!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid Credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4 font-sans">
      <div className="bg-white w-full max-w-[420px] rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] p-10 flex flex-col items-center">
        
        <div className="w-24 h-24 bg-black rounded-full flex items-center justify-center mb-6 shadow-xl overflow-hidden border-4 border-white">
           <img src="/qcu-logo.jpg" alt="QCU Logo" className="w-full h-full object-cover" />
        </div>

        <h1 className="text-2xl font-black text-slate-900 mb-1 text-center leading-tight">Welcome to QCU<br/>MarketPlace</h1>
        <p className="text-[12px] text-slate-500 mb-8 font-semibold uppercase tracking-wider">Sign in to continue</p>

        <button onClick={handleGoogleLogin} disabled={loading} type="button" className="w-full border border-slate-200 rounded-xl py-3.5 flex items-center justify-center gap-3 hover:bg-slate-50 transition-all font-bold text-slate-700 text-sm mb-6 shadow-sm bg-white active:scale-95">
          <img src="/google-logo.png" className="w-5 h-5" alt="google" />
          {loading ? 'Processing...' : 'Continue with Google'}
        </button>

        <div className="w-full flex items-center gap-4 mb-6">
          <div className="h-[1px] bg-slate-100 flex-1"></div>
          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">OR</span>
          <div className="h-[1px] bg-slate-100 flex-1"></div>
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-5">
          <div>
            <label className="text-[10px] font-black text-slate-500 mb-1.5 ml-1 block uppercase tracking-widest">Email</label>
            <div className="relative">
              <span className="absolute left-4 top-[14px] text-lg opacity-50">✉️</span>
              <input type="email" placeholder="you@example.com" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:bg-white outline-none focus:border-[#800000]/30 transition-all" required onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-500 mb-1.5 ml-1 block uppercase tracking-widest">Password</label>
            <div className="relative">
              <span className="absolute left-4 top-[14px] text-lg opacity-50">🔒</span>
              <input type="password" placeholder="••••••••" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:bg-white outline-none focus:border-[#800000]/30 transition-all" required onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-[#1e293b] text-white font-black py-4 rounded-2xl transition-all shadow-xl hover:bg-black text-sm active:scale-[0.98] mt-2">
            {loading ? 'Authenticating...' : 'Sign in'}
          </button>
        </form>

        <div className="mt-10 flex justify-between w-full text-[11px] font-bold px-2">
           <Link href="/forgot-password" className="px-2 text-slate-400 hover:text-[#800000]">Forgot password?</Link>
           <div className="text-slate-400">
             Need an account? <Link href="/register" className="text-slate-900 hover:underline">Sign up</Link>
           </div>
        </div>
      </div>
    </div>
  );
}