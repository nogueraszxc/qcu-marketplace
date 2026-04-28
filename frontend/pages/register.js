import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function Register() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [passReqs, setPassReqs] = useState({ length: false, upper: false, lower: false, num: false, special: false });
  const [isPasswordValid, setIsPasswordValid] = useState(false);

  const { register, googleLogin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const p = formData.password;
    const reqs = {
      length: p.length >= 8,
      upper: /[A-Z]/.test(p),
      lower: /[a-z]/.test(p),
      num: /[0-9]/.test(p),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(p)
    };
    setPassReqs(reqs);
    setIsPasswordValid(Object.values(reqs).every(Boolean));
  }, [formData.password]);

  const handleGoogleSignUp = async () => {
    try {
      await googleLogin();
      toast.success("Welcome to QCU Marketplace!");
      router.push('/dashboard');
    } catch (error) {
      toast.error("Google Sign-up failed.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isPasswordValid) return toast.error("Please meet all password requirements.");
    setLoading(true);
    try {
      await register(formData.name, formData.email, formData.password);
      toast.success('Account created successfully!');
      router.push('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4 font-sans py-10">
      <div className="bg-white w-full max-w-[450px] rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] p-10 flex flex-col items-center">
        
        {/* QCU LOGO (LOCAL PATH) */}
        <div className="w-20 h-20 bg-black rounded-[20px] flex items-center justify-center mb-6 shadow-lg overflow-hidden border-2 border-white">
           <img src="/qcu-logo.jpg" alt="QCU Logo" className="w-full h-full object-cover" />
        </div>

        <h1 className="text-2xl font-black text-slate-900 mb-1 text-center">Create Account</h1>
        <p className="text-[12px] text-slate-500 mb-8 font-semibold uppercase tracking-wider">Join our student community</p>

        {/* GOOGLE BUTTON (LOCAL PATH) */}
        <button onClick={handleGoogleSignUp} type="button" className="w-full border border-slate-200 rounded-xl py-3 flex items-center justify-center gap-3 hover:bg-slate-50 transition-all font-bold text-slate-700 text-sm mb-6">
          <img src="/google-logo.png" className="w-4 h-4" alt="google" />
          Sign up with Google
        </button>

        <div className="w-full flex items-center gap-4 mb-6">
          <div className="h-[1px] bg-slate-100 flex-1"></div>
          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">OR</span>
          <div className="h-[1px] bg-slate-100 flex-1"></div>
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div className="group">
            <label className="text-[10px] font-black text-slate-500 mb-1.5 ml-1 block uppercase tracking-widest">Full Name</label>
            <input type="text" placeholder="Juan Dela Cruz" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm focus:bg-white outline-none focus:border-[#800000]/30 transition-all" required onChange={(e) => setFormData({...formData, name: e.target.value})} />
          </div>

          <div className="group">
            <label className="text-[10px] font-black text-slate-500 mb-1.5 ml-1 block uppercase tracking-widest">Email</label>
            <input type="email" placeholder="you@example.com" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm focus:bg-white outline-none focus:border-[#800000]/30 transition-all" required onChange={(e) => setFormData({...formData, email: e.target.value})} />
          </div>

          <div className="group">
            <label className="text-[10px] font-black text-slate-500 mb-1.5 ml-1 block uppercase tracking-widest">Password</label>
            <input type="password" placeholder="••••••••" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm focus:bg-white outline-none focus:border-[#800000]/30 transition-all" required onChange={(e) => setFormData({...formData, password: e.target.value})} />
          </div>

          {/* PASSWORD SECURITY GUIDE */}
          {formData.password.length > 0 && (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-[10px] font-bold space-y-1.5 mb-2">
              <p className={`flex items-center gap-2 ${passReqs.length ? 'text-green-600' : 'text-slate-400'}`}>
                {passReqs.length ? '✅' : '⚪'} At least 8 characters
              </p>
              <p className={`flex items-center gap-2 ${passReqs.upper ? 'text-green-600' : 'text-slate-400'}`}>
                {passReqs.upper ? '✅' : '⚪'} Uppercase (A-Z) & Lowercase (a-z)
              </p>
              <p className={`flex items-center gap-2 ${passReqs.num && passReqs.special ? 'text-green-600' : 'text-slate-400'}`}>
                {passReqs.num && passReqs.special ? '✅' : '⚪'} Numbers & Special characters
              </p>
            </div>
          )}

          <button type="submit" disabled={loading || !isPasswordValid} className={`w-full text-white font-black py-4 rounded-2xl transition-all shadow-xl text-sm ${isPasswordValid ? 'bg-[#1e293b] hover:bg-black active:scale-95' : 'bg-slate-300 cursor-not-allowed'}`}>
            {loading ? 'Creating Account...' : 'Sign up Now'}
          </button>
        </form>

        <div className="mt-8 text-center w-full text-[12px] font-bold text-slate-400">
          Already have an account? <Link href="/login" className="text-slate-900 hover:underline ml-1">Log in here</Link>
        </div>
      </div>
    </div>
  );
}