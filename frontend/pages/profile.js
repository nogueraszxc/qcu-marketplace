import Head from 'next/head';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';

export default function Profile() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  // --- EDIT MODE STATES ---
  const [isEditing, setIsEditing] = useState(false);
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');

  // Para maiwasan ang hydration error sa Next.js
  useEffect(() => {
    setMounted(true);
  }, []);

  const getInitials = (userObj) => {
    if (!userObj) return 'U';
    const name = userObj.name || userObj.displayName || userObj.email || 'User';
    const names = name.split(' ');
    if (names.length >= 2) return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  // Function kapag pinindot ang SAVE button
  const handleSave = () => {
    // Dito mo i-ccall ang axios.put papuntang backend mo in the future para i-save sa MongoDB
    // const res = await axios.put('/api/users/profile', { phone, bio }, ...)
    
    setIsEditing(false); // Babalik sa normal view pagkatapos i-save
  };

  if (!mounted) return null;

  const displayName = user?.name || user?.displayName || 'Loading...';

  return (
    <div className="min-h-screen bg-[#f8fafc] w-full flex flex-col pb-20">
      <Head>
        <title>My Profile | QCU Marketplace</title>
      </Head>

      <div className="max-w-4xl mx-auto px-4 py-10 w-full flex-grow">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-8">My Profile</h1>

        {/* PROFILE CARD */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="h-28 bg-[#800000]"></div>
          
          <div className="px-8 pb-8 relative">
            <div className="absolute -top-12 left-8 w-24 h-24 bg-[#FFD700] rounded-full border-4 border-white flex items-center justify-center text-3xl font-black text-[#800000] shadow-md select-none">
              {getInitials(user)}
            </div>
            
            {/* --- DYNAMIC EDIT / SAVE BUTTON --- */}
            <div className="flex justify-end pt-4 mb-4">
              {isEditing ? (
                <button 
                  onClick={handleSave} 
                  className="flex items-center gap-1.5 bg-[#800000] px-5 py-2 rounded-lg text-xs font-bold text-white hover:bg-[#600000] transition-colors shadow-sm"
                >
                  {/* Save Icon */}
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
                  Save
                </button>
              ) : (
                <button 
                  onClick={() => setIsEditing(true)} 
                  className="flex items-center gap-1.5 border border-gray-200 px-5 py-2 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
                >
                  {/* Edit Pencil Icon */}
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                  Edit
                </button>
              )}
            </div>

            <div className="mt-2 border-b border-gray-100 pb-6">
               <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{displayName}</h2>
               <p className="text-sm font-medium text-gray-500 mb-6">{user?.email || 'Loading...'}</p>

               <div className="space-y-6">
                  {/* EMAIL SECTION */}
                  <div className="flex gap-4">
                     <svg className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                     <div className="w-full">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Email</p>
                        <p className="text-sm font-semibold text-gray-800">{user?.email || 'Loading...'}</p>
                     </div>
                  </div>

                  {/* PHONE SECTION (Dynamic Input) */}
                  <div className="flex gap-4">
                     <svg className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                     <div className="w-full max-w-xl">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Phone</p>
                        {isEditing ? (
                          <input 
                            type="text" 
                            placeholder="e.g., 09XXXXXXXXX" 
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full border border-gray-200 rounded-md py-2 px-3 text-sm focus:outline-none focus:border-gray-400 mt-1 transition-colors"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-gray-800">{phone || 'Not set'}</p>
                        )}
                     </div>
                  </div>

                  {/* BIO SECTION (Dynamic Input) */}
                  <div className="flex gap-4">
                     <svg className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                     <div className="w-full max-w-xl">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Bio</p>
                        {isEditing ? (
                          <textarea 
                            placeholder="Tell others about yourself..." 
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            rows="3"
                            className="w-full border border-gray-200 rounded-md py-2 px-3 text-sm focus:outline-none focus:border-gray-400 mt-1 resize-none transition-colors"
                          ></textarea>
                        ) : (
                          <p className="text-sm font-semibold text-gray-800">{bio || 'No bio yet.'}</p>
                        )}
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* 3 STATS CARDS */}
        <div className="grid grid-cols-3 gap-4 mb-6">
           <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center mb-3">
                 <svg className="w-5 h-5 text-[#800000]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
              </div>
              <h3 className="text-2xl font-black text-[#800000]">0</h3>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">Listings</p>
           </div>
           <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center mb-3">
                 <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
              </div>
              <h3 className="text-2xl font-black text-blue-600">0</h3>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">Purchases</p>
           </div>
           <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-yellow-50 rounded-full flex items-center justify-center mb-3">
                 <svg className="w-5 h-5 text-[#FFD700]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg>
              </div>
              <h3 className="text-2xl font-black text-[#FFD700]">0</h3>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">Items Sold</p>
           </div>
        </div>

        {/* ACCOUNT INFO */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
           <h3 className="text-sm font-bold text-gray-900 mb-6">Account Info</h3>
           <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                 <span className="text-gray-500 font-medium">Member since</span>
                 <span className="font-semibold text-gray-900">April 2026</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                 <span className="text-gray-500 font-medium">Account role</span>
                 <span className="font-semibold text-gray-900 capitalize">{user?.role || 'User'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                 <span className="text-gray-500 font-medium">Rating</span>
                 <span className="font-semibold text-gray-900 flex items-center gap-1">
                   <svg className="w-4 h-4 text-[#FFD700]" fill="currentColor" viewBox="0 0 24 24"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg>
                   5/5.0
                 </span>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}