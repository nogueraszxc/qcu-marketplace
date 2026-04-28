import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout(); // Tatanggalin nito yung session mo
    router.push('/');
  };

  return (
    <nav className="bg-[#800000] text-white py-3.5 px-6 shadow-md sticky top-0 z-[100] w-full">
      <div className="max-w-[1400px] mx-auto flex justify-between items-center">
        
        {/* LOGO */}
        <Link href="/" className="flex items-center gap-3 cursor-pointer">
          <div className="bg-[#FFD700] p-1.5 rounded-lg shadow-sm">
            <svg className="w-6 h-6 text-[#800000]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
            </svg>
          </div>
          <div className="leading-none text-left mt-0.5">
            <h1 className="text-xl font-bold tracking-wide uppercase leading-none">QCU</h1>
            <p className="text-[10px] font-bold text-[#FFD700] uppercase leading-none mt-1">BUY & SELL</p>
          </div>
        </Link>

        {/* CENTER LINKS (Dynamic) */}
        <div className="hidden md:flex items-center gap-6">
          {user ? (
            /* IMAGE 1: LOGGED IN */
            <>
              <Link href="/dashboard" className="bg-white/20 px-6 py-2 rounded-full text-[13px] font-semibold transition-colors">Browse</Link>
              <Link href="#" className="text-[13px] font-semibold hover:text-white/80 transition-colors">Dashboard</Link>
              <Link href="#" className="text-[13px] font-semibold hover:text-white/80 transition-colors">My Listings</Link>
              <Link href="#" className="text-[13px] font-semibold hover:text-white/80 transition-colors">Transactions</Link>
            </>
          ) : (
            /* IMAGE 2: LOGGED OUT */
            <button className="bg-white/10 border border-white/20 px-8 py-1.5 rounded-full text-xs font-bold uppercase hover:bg-white/20 transition-colors">
              Browse
            </button>
          )}
        </div>

        {/* RIGHT ACTIONS (Dynamic) */}
        <div className="flex items-center gap-5">
          {user ? (
            /* IMAGE 1: LOGGED IN */
            <>
              <button className="bg-[#FFD700] text-[#800000] px-4 py-2 rounded-lg text-[13px] font-bold shadow-md hover:bg-yellow-400 flex items-center gap-1 transition-all">
                + Sell
              </button>
              <div 
                onClick={handleLogout}
                className="w-10 h-10 bg-[#FFD700] rounded-full flex items-center justify-center text-[#800000] font-bold text-[13px] cursor-pointer hover:ring-4 hover:ring-[#FFD700]/50 transition-all shadow-md border border-[#c4a400]"
                title="Click to Logout"
              >
                {/* Kukunin nito ang initials mula sa Google Account mo */}
                {user.displayName ? user.displayName.substring(0, 2).toUpperCase() : 'CN'}
              </div>
            </>
          ) : (
            /* IMAGE 2: LOGGED OUT */
            <>
              <Link href="/login" className="text-[13px] font-bold hover:text-[#FFD700] transition-colors">Login</Link>
              <Link href="/register" className="bg-[#FFD700] text-[#800000] px-6 py-2 rounded-lg text-[13px] font-bold shadow-md hover:bg-yellow-400 transition-all uppercase">Sign Up</Link>
            </>
          )}
        </div>

      </div>
    </nav>
  );
}