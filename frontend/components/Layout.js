import Navbar from './Navbar';
import Footer from './Footer';
import Icon from './Icon';
import MotionPage from './MotionPage';
import {useRouter} from 'next/router';
import {useAuth} from '../context/AuthContext';
export default function Layout({children}){
 const router=useRouter(),{sessionNotice,clearSessionNotice}=useAuth();
 const isolated=['/login','/register','/forgot-password','/reset-password'].includes(router.pathname),admin=router.pathname==='/admin';
 const path=router.isReady?router.asPath.split(/[?#]/)[0]:router.pathname;
 return <div className={'app-layout '+(!isolated&&!admin?'has-mobile-nav client-workspace':'')}><div className="route-progress" aria-hidden="true"/><a className="skip-link" href="#main-content">Skip to content</a>{sessionNotice&&<div className="session-notice" role="alert"><span>{sessionNotice}</span><button onClick={clearSessionNotice} aria-label="Dismiss account notice"><Icon name="x" size={18}/></button></div>}{!isolated&&!admin&&<Navbar/>}<main id="main-content" className="app-main" tabIndex={-1}><MotionPage key={path}>{children}</MotionPage></main>{!isolated&&!admin&&<Footer/>}</div>;
}
