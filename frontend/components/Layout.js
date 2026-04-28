import Navbar from './Navbar';
import Footer from './Footer';
import { useRouter } from 'next/router';

export default function Layout({ children }) {
  const router = useRouter();
  
  // Itatago ang Navbar at Footer sa Login/Register
  const isolatedPages = ['/login', '/register'];
  const isIsolated = isolatedPages.includes(router.pathname);

  // Itatago ang NORMAL na Navbar kapag nasa Admin ka na (para walang conflict)
  const hideNavbar = isIsolated || router.pathname === '/admin';

  return (
    <div className="min-h-screen bg-[#f3f4f6] flex flex-col font-sans">
      {!hideNavbar && <Navbar />}
      <main className="flex-grow w-full flex flex-col">
        {children}
      </main>
      {!isIsolated && <Footer />}
    </div>
  );
}