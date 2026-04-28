import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    setIsDropdownOpen(false);
  };

  if (['/login', '/register', '/forgot-password'].includes(router.pathname)) return null;

  const getInitials = (name) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length >= 2) return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const navItemStyle = (path) => {
    const isActive = router.pathname === path;
    return `px-4 py-2 rounded-full text-sm transition-all duration-200 ${
      isActive 
        ? 'bg-white/10 text-white font-medium' 
        : 'text-white/80 hover:text-white hover:bg-white/5 font-normal'
    }`;
  };

  return (
    <nav className="bg-[#8A1C30] text-white py-3 px-6 shadow-sm sticky top-0 z-[1000] font-sans">
      <div className="max-w-[1400px] mx-auto flex justify-between items-center">
        
        {/* LOGO */}
        <Link href="/" className="flex items-center gap-3 cursor-pointer">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm overflow-hidden border-2 border-white">
            <img src="/qcu-logo.jpg" alt="QCU Logo" className="w-full h-full object-cover" />
          </div>
          <div className="leading-none text-left">
            <h1 className="text-base font-bold tracking-wide uppercase leading-none">QCU</h1>
            <p className="text-[10px] text-[#FFD700] font-semibold tracking-wider uppercase">Buy & Sell</p>
          </div>
        </Link>

        {user ? (
          <>
            <div className="hidden md:flex items-center gap-2">
              <Link href="/browse" className={navItemStyle('/browse')}>Browse</Link>
              <Link href="/dashboard" className={navItemStyle('/dashboard')}>Dashboard</Link>
              <Link href="/my-listings" className={navItemStyle('/my-listings')}>My Listings</Link>
              {/* PINALITAN: Transactions Label to Inbox */}
              <Link href="/transactions" className={navItemStyle('/transactions')}>Inbox</Link>
            </div>

            <div className="flex items-center gap-4 relative" ref={dropdownRef}>
              <Link href="/sell" className="bg-[#FFD700] text-[#8A1C30] px-4 py-1.5 rounded-full text-sm font-bold shadow-sm hover:bg-yellow-400 flex items-center gap-1 transition-all">
                + Sell
              </Link>
              
              <div 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-9 h-9 bg-[#FFD700] rounded-full flex items-center justify-center text-[#8A1C30] font-bold text-sm cursor-pointer hover:ring-2 hover:ring-[#FFD700]/50 transition-all select-none"
              >
                {getInitials(user.name || user.email)}
              </div>

              {isDropdownOpen && (
                <div className="absolute right-0 top-12 w-[220px] bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                  <div className="px-4 pb-3 border-b border-gray-100 mb-1 pt-2 text-left">
                    <p className="text-sm font-semibold text-gray-800 truncate">{user?.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>
                  <Link href="/profile" onClick={() => setIsDropdownOpen(false)} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">My Profile</Link>
                  <Link href="/dashboard" onClick={() => setIsDropdownOpen(false)} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Dashboard</Link>
                  <Link href="/my-listings" onClick={() => setIsDropdownOpen(false)} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">My Listings</Link>
                  {/* PINALITAN DIN DITO */}
                  <Link href="/transactions" onClick={() => setIsDropdownOpen(false)} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Inbox</Link>
                  <div className="mt-1 pt-1 border-t border-gray-100">
                    <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium">Log out</button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-sm font-semibold text-white/90 hover:text-white">Login</Link>
            <Link href="/register" className="bg-[#FFD700] text-[#8A1C30] px-6 py-2 rounded-full text-sm font-bold shadow-sm hover:bg-yellow-400 transition-all">Sign up</Link>
          </div>
        )}
      </div>
    </nav>
  );
}