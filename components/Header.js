"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function Header({ title, subtitle }) {
  const router = useRouter();
  
  const [isMounted, setIsMounted] = useState(false);
  
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("ADMIN"); 
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(null);

  useEffect(() => {
    setIsMounted(true);
    getUserData();
  }, []);

  const getUserData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUserEmail(session.user.email);
      
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role, display_name, avatar_url')
        .eq('email', session.user.email)
        .maybeSingle();
        
      if (roleData) {
        if (roleData.role) setUserRole(roleData.role.toUpperCase());
        if (roleData.display_name) setDisplayName(roleData.display_name);
        if (roleData.avatar_url) setAvatarUrl(roleData.avatar_url);
      }
    } else {
      setUserEmail("Guest");
    }
  };

  const openSidebar = () => {
    window.dispatchEvent(new Event('toggleSidebar'));
  };

  if (!isMounted) {
    return (
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 px-6 py-4 flex justify-between items-center h-[73px]">
      </header>
    );
  }

  const initial = userEmail && userEmail !== "Guest" ? userEmail.charAt(0).toUpperCase() : "U";
  const shortName = displayName || (userEmail.includes('@') ? userEmail.split('@')[0] : userEmail || "User");

  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 px-6 py-4 flex justify-between items-center transition-all">
      <div className="flex items-center gap-4">
        
        {/* BUTANG HAMBURGER - KINI SENTIASA KELIHATAN UNTUK SEMUA SKRIN */}
        <button 
          onClick={openSidebar} 
          className="p-2 bg-white border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 focus:outline-none transition-colors shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        
        {/* TAJUK HALAMAN */}
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">{title}</h1>
          {subtitle && <p className="text-xs md:text-sm font-semibold text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>

      {/* BUTANG PROFIL KANAN ATAS */}
      <button 
        onClick={() => router.push('/account')}
        className="flex items-center gap-3 p-1.5 pr-4 bg-white border border-slate-200 rounded-full hover:bg-slate-50 hover:border-blue-300 hover:shadow-sm transition-all outline-none group"
      >
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black shadow-inner shadow-indigo-900/20 group-hover:scale-105 transition-transform overflow-hidden">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span>{initial}</span>
          )}
        </div>
        
        <div className="hidden md:block text-left">
          <p className="text-xs font-extrabold text-slate-800 leading-none truncate max-w-[120px] capitalize group-hover:text-blue-600 transition-colors">
            {shortName}
          </p>
          <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mt-0.5 flex items-center">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1 animate-pulse"></span>
            {userRole}
          </p>
        </div>
      </button>
    </header>
  );
}