import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Footer() {
  const router = useRouter();

  // Huwag ipakita ang Footer sa login at register pages para malinis
  if (['/login', '/register'].includes(router.pathname)) return null;

  return (
    <footer className="bg-[#8A1C30] text-white/80 py-12 px-8 font-sans border-t border-white/10 mt-auto">
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
        
        {/* BRANDING SECTION */}
        <div className="md:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-[#E6B93D] rounded-lg flex items-center justify-center text-[#8A1C30] shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-lg font-black tracking-widest text-white">QCU</span>
              <span className="text-[9px] font-black text-[#E6B93D] uppercase tracking-widest mt-0.5">Buy & Sell</span>
            </div>
          </div>
          <p className="text-sm font-medium leading-relaxed text-white/70 max-w-sm">
            The trusted marketplace for QCU students and faculty. Find great deals or sell your items safely within the campus community.
          </p>
        </div>

        {/* QUICK LINKS */}
        <div>
          <h4 className="text-[#E6B93D] font-bold text-xs uppercase tracking-widest mb-4">Quick Links</h4>
          <ul className="space-y-3 text-sm font-medium">
            <li><Link href="/browse" className="hover:text-white transition-colors">Browse Products</Link></li>
            <li><Link href="/dashboard" className="hover:text-white transition-colors">My Dashboard</Link></li>
            <li><Link href="/sell" className="hover:text-white transition-colors">Sell an Item</Link></li>
            <li><Link href="/transactions" className="hover:text-white transition-colors">Transactions</Link></li>
          </ul>
        </div>

        {/* SUPPORT / LEGAL */}
        <div>
          <h4 className="text-[#E6B93D] font-bold text-xs uppercase tracking-widest mb-4">Support</h4>
          <ul className="space-y-3 text-sm font-medium">
            <li><Link href="#" className="hover:text-white transition-colors">Safety Guidelines</Link></li>
            <li><Link href="#" className="hover:text-white transition-colors">Report an Issue</Link></li>
            <li><Link href="#" className="hover:text-white transition-colors">Terms of Service</Link></li>
            <li><Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link></li>
          </ul>
        </div>

      </div>

      <div className="max-w-[1400px] mx-auto mt-12 pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-medium text-white/50">
        <p>&copy; {new Date().getFullYear()} Quezon City University Marketplace. All rights reserved.</p>
        <p>Designed for the QCU Community.</p>
      </div>
    </footer>
  );
}