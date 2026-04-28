import Head from 'next/head';
import Link from 'next/link';

export default function Home() {
  const categories = ['All', 'Books', 'Electronics', 'Clothing', 'Food', 'Services', 'Others'];

  return (
    <div className="min-h-screen bg-white w-full">
      <Head>
        <title>QCU Buy & Sell | Campus Marketplace</title>
      </Head>

      {/* --- HERO SECTION --- */}
      <div className="bg-[#800000] pt-16 pb-28 px-6 text-center relative w-full overflow-hidden">
        <div className="absolute inset-0 opacity-5 flex items-center justify-center pointer-events-none">
           <h1 className="text-[25vw] font-black text-white select-none">QCU</h1>
        </div>

        <div className="max-w-5xl mx-auto relative z-10">
          <span className="inline-block px-4 py-1 rounded-md bg-[#FFD700]/10 text-[#FFD700] text-[11px] font-bold border border-[#FFD700]/30 mb-8 uppercase tracking-widest">
            QCU Community Marketplace
          </span>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight tracking-tight">
            Buy & Sell Within <br/> <span className="text-[#FFD700]">QCU Campus</span>
          </h1>
          <p className="text-blue-50/70 text-lg md:text-xl max-w-2xl mx-auto mb-12 font-medium">
            The trusted marketplace for QCU students and faculty. Find great deals or sell your items safely.
          </p>

          <div className="flex justify-center gap-4 mb-20">
            {/* INI-UPDATE KO ANG LINKS DITO PARA MAPUNTA SA LOGIN PAGE (Image 2) */}
            <Link href="/login" className="bg-[#FFD700] text-[#800000] px-10 py-3.5 rounded-xl font-bold text-sm shadow-xl hover:bg-yellow-400 transition-all active:scale-95">
              Get Started
            </Link>
            <Link href="/login" className="bg-transparent border-2 border-white/20 text-white px-10 py-3.5 rounded-xl font-bold text-sm hover:bg-white/10 transition-all active:scale-95">
              Sign In
            </Link>
          </div>

          <div className="max-w-3xl mx-auto bg-white rounded-full p-2 shadow-2xl flex items-center">
            <div className="pl-6 pr-3 text-gray-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
            <input type="text" placeholder="Search products, sellers..." className="w-full py-4 bg-transparent border-none focus:ring-0 text-gray-800 text-sm outline-none" />
            <button className="bg-[#800000] text-white px-10 py-3.5 rounded-full font-bold text-sm hover:bg-[#600000] transition-colors">Search</button>
          </div>
        </div>
      </div>

      {/* --- STATS BAR --- */}
      <div className="bg-white border-b border-gray-100 py-5 w-full shadow-sm">
        <div className="max-w-7xl mx-auto px-6 flex justify-center items-center gap-12 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
           <span className="flex items-center gap-2"><span className="text-orange-500 text-lg">🔥</span> 11 ACTIVE LISTINGS</span>
           <span className="flex items-center gap-2 font-bold"><span className="text-green-500 text-lg">📈</span> 0 ITEMS SOLD</span>
           <span className="flex items-center gap-2 font-bold"><span className="text-blue-500 text-lg">📦</span> 6 CATEGORIES</span>
        </div>
      </div>

      <div className="w-full bg-white py-12 pb-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-wrap justify-center gap-3 mb-16">
            {categories.map((cat, i) => (
              <button key={i} className={`px-8 py-2.5 rounded-full text-[11px] font-bold transition-all border ${i === 0 ? 'bg-[#800000] text-white border-[#800000] shadow-md shadow-maroon-100' : 'bg-white text-gray-500 border-gray-200 hover:border-[#800000] hover:text-[#800000]'}`}>
                {cat}
              </button>
            ))}
          </div>
          <div className="text-center py-20 text-sm font-bold text-gray-200 uppercase tracking-tighter italic">
            No products found
          </div>
        </div>
      </div>
    </div>
  );
}