import Head from 'next/head';
import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSent, setIsSent] = useState(false); // State para sa success view
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('http://localhost:5000/api/users/forgot-password', { email });
      setIsSent(true); // Pag success, ipakita ang "Check your email"
      toast.success("Reset link sent!");
    } catch (error) {
      toast.error(error.response?.data?.message || "User not found");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FBFF] flex items-center justify-center font-sans p-6">
      <Head><title>Reset Password | QCU Marketplace</title></Head>

      <div className="bg-white w-full max-w-[420px] rounded-2xl shadow-xl border border-gray-50 p-10 flex flex-col items-center animate-fadeIn">
        
        {!isSent ? (
          <>
            <button onClick={() => router.push('/login')} className="text-sm text-gray-400 mb-6 flex items-center gap-2 hover:text-gray-600 self-start transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg> 
              Back to sign in
            </button>
            <h1 className="text-2xl font-bold text-[#111827] mb-2 text-center">Reset your password</h1>
            <p className="text-sm text-gray-500 text-center mb-8 px-4 leading-relaxed">
              Enter your email and we'll send you a link to reset your password
            </p>
            <form onSubmit={handleSubmit} className="w-full space-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700 text-center">Email</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg></span>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full bg-white border border-gray-200 rounded-lg py-3 pl-12 pr-4 text-sm outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all text-center" required />
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full bg-[#111827] text-white py-3.5 rounded-lg text-sm font-semibold hover:bg-black transition-all shadow-lg active:scale-[0.98] disabled:opacity-50">
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
            </form>
          </>
        ) : (
          /* SUCCESS VIEW - IMAGE REFERENCE 1 */
          <div className="flex flex-col items-center text-center animate-fadeIn">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
            </div>
            <h1 className="text-2xl font-bold text-[#111827] mb-2">Check your email</h1>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
              We've sent password reset instructions to<br/>
              <span className="font-semibold text-slate-800">{email}</span>
            </p>
            <div className="w-full bg-green-50 border border-green-100 rounded-xl p-4 mb-8">
              <p className="text-[13px] text-green-700 leading-relaxed">
                Please check your email for the password reset link. It may take a few minutes to arrive.
              </p>
            </div>
            <button onClick={() => router.push('/login')} className="text-sm font-medium text-gray-500 flex items-center gap-2 hover:text-gray-800 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg> 
              Back to sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}