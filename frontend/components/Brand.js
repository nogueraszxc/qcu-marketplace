import Link from 'next/link';
import Icon from './Icon';
import Image from 'next/image';
import { universityAssetsEnabled } from '../lib/branding';
export default function Brand({compact=false,light=false}){
 return <Link href="/" className={'brand '+(light?'brand-light':'')} aria-label="QCU Marketplace home"><span className={"brand-mark "+(universityAssetsEnabled?"brand-mark-seal":"")}>{universityAssetsEnabled?<Image src="/api/brand-assets?asset=seal" width={48} height={48} alt="Quezon City University seal" unoptimized/>:<Icon name="store" size={26}/>}</span><span className="brand-type"><strong>QCU<span className="brand-dot">.</span></strong>{!compact&&<span>MARKETPLACE</span>}</span></Link>;
}