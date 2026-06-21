"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname(); 
  
  const [allowedModules, setAllowedModules] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  
  // Data Profil
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("Memuatkan...");
  const [userRole, setUserRole] = useState("STAFF");
  const [avatarUrl, setAvatarUrl] = useState(null);
  
  // State untuk menu Accordion (Buka/Tutup)
  const [expanded, setExpanded] = useState({
    crm: false,
    creator: false, 
    operasi: false,
    pengurusan: false
  });

  useEffect(() => {
    const fetchUserAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setUserEmail(session.user.email);
        
        const { data: profile } = await supabase
          .from("user_roles")
          .select("modules, role, full_name, display_name, avatar_url")
          .eq("email", session.user.email)
          .single();
          
        if (profile) {
          if (profile.modules) {
            setAllowedModules(profile.modules);
          } else {
            // Default akses jika modul kosong
            setAllowedModules(["dashboard", "sales", "content-stats", "leads", "inventory", "tasks", "account"]); 
          }
          
          setUserRole(profile.role ? profile.role.toUpperCase() : "STAFF");
          setUserName(profile.display_name || profile.full_name || session.user.email.split('@')[0]);
          if (profile.avatar_url) setAvatarUrl(profile.avatar_url);
        }
      }
    };
    fetchUserAccess();

    const handleToggle = () => setIsOpen(true);
    window.addEventListener('toggleSidebar', handleToggle);
    return () => window.removeEventListener('toggleSidebar', handleToggle);
  }, []);

  useEffect(() => {
    if (['/dashboard', '/sales', '/customers'].includes(pathname)) {
      setExpanded(prev => ({ ...prev, crm: true }));
    } else if (['/creator-dashboard', '/creator-daily', '/creator-library'].includes(pathname)) {
      setExpanded(prev => ({ ...prev, creator: true }));
    } else if (['/leads', '/inventory'].includes(pathname)) {
      setExpanded(prev => ({ ...prev, operasi: true }));
    } else if (['/hr', '/tasks', '/account', '/settings'].includes(pathname)) {
      setExpanded(prev => ({ ...prev, pengurusan: true }));
    }
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const toggleMenu = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const navigate = (path) => {
    setIsOpen(false); 
    router.push(path);
  };

  const initial = userEmail ? userEmail.charAt(0).toUpperCase() : "U";

  return (
    <>
      {/* LATAR BELAKANG GELAP TERAPUNG */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[90] transition-opacity"
          onClick={() => setIsOpen(false)}
        ></div>
      )}

      {/* SIDEBAR DRAWER */}
      <div className={`fixed top-0 left-0 h-screen w-72 bg-white flex flex-col shadow-2xl border-r border-slate-200 z-[100] transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* LOGO & BRANDING */}
        <div className="p-6 pb-5 flex justify-between items-center bg-white z-20 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tighter flex items-center">
              <span className="text-transparent bg-clip-text bg-gradient-to-br from-blue-600 to-indigo-600 mr-1">H</span>armony
            </h2>
            <p className="text-slate-400 text-[9px] mt-1 font-extrabold tracking-[0.2em] uppercase">Command Center</p>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* SENARAI MENU ACCORDION */}
        <nav className="flex-1 px-4 py-6 overflow-y-auto custom-scrollbar space-y-2">
          
          {/* SEKSYEN 1: CRM & SALES */}
          {(allowedModules.includes("dashboard") || allowedModules.includes("sales")) && (
            <div className="mb-2">
              <button onClick={() => toggleMenu('crm')} className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors group outline-none">
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-widest group-hover:text-blue-600 transition-colors">CRM & Sales</span>
                <svg className={`w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-transform duration-300 ${expanded.crm ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
              </button>
              
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expanded.crm ? 'max-h-60 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                <div className="space-y-1 pl-4 ml-4 border-l-2 border-slate-100 py-2">
                  {allowedModules.includes("dashboard") && (
                    <button onClick={() => navigate('/dashboard')} className={`w-full flex items-center px-4 py-2.5 rounded-xl font-bold transition-all text-sm ${pathname === '/dashboard' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
                      Sales Dashboard
                    </button>
                  )}
                  {allowedModules.includes("sales") && (
                    <button onClick={() => navigate('/sales')} className={`w-full flex items-center px-4 py-2.5 rounded-xl font-bold transition-all text-sm ${pathname === '/sales' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
                      Borang Jualan
                    </button>
                  )}
                  {allowedModules.includes("sales") && (
                    <button onClick={() => navigate('/customers')} className={`w-full flex items-center px-4 py-2.5 rounded-xl font-bold transition-all text-sm ${pathname === '/customers' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
                      Customer Database
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SEKSYEN 2: CREATOR & TIKTOK */}
          {allowedModules.includes("content-stats") && (
            <div className="mb-2">
              <button onClick={() => toggleMenu('creator')} className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors group outline-none">
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider group-hover:text-indigo-600 transition-colors">Creator & TikTok</span>
                <svg className={`w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-transform duration-300 ${expanded.creator ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
              </button>
              
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expanded.creator ? 'max-h-60 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                <div className="space-y-1 pl-4 ml-4 border-l-2 border-slate-100 py-2">
                  <button onClick={() => navigate('/creator-dashboard')} className={`w-full flex items-center px-4 py-2.5 rounded-xl font-bold transition-all text-sm ${pathname === '/creator-dashboard' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
                    Analytics Dashboard
                  </button>
                  <button onClick={() => navigate('/creator-daily')} className={`w-full flex items-center px-4 py-2.5 rounded-xl font-bold transition-all text-sm ${pathname === '/creator-daily' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
                    Daily Achievement
                  </button>
                  <button onClick={() => navigate('/creator-library')} className={`w-full flex items-center px-4 py-2.5 rounded-xl font-bold transition-all text-sm ${pathname === '/creator-library' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
                    Data Library
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SEKSYEN 3: OPERASI UTAMA */}
          {(allowedModules.includes("leads") || allowedModules.includes("inventory")) && (
            <div className="mb-2">
              <button onClick={() => toggleMenu('operasi')} className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors group outline-none">
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-widest group-hover:text-emerald-600 transition-colors">Operasi Utama</span>
                <svg className={`w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-transform duration-300 ${expanded.operasi ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
              </button>
              
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expanded.operasi ? 'max-h-60 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                <div className="space-y-1 pl-4 ml-4 border-l-2 border-slate-100 py-2">
                  {allowedModules.includes("leads") && (
                    <button onClick={() => navigate('/leads')} className={`w-full flex items-center px-4 py-2.5 rounded-xl font-bold transition-all text-sm ${pathname === '/leads' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
                      Leads Management
                    </button>
                  )}
                  {allowedModules.includes("inventory") && (
                    <button onClick={() => navigate('/inventory')} className={`w-full flex items-center px-4 py-2.5 rounded-xl font-bold transition-all text-sm ${pathname === '/inventory' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
                      Inventory System
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SEKSYEN 4: PENGURUSAN */}
          {(allowedModules.includes("hr") || allowedModules.includes("tasks") || allowedModules.includes("account") || allowedModules.includes("settings")) && (
            <div className="mb-2">
              <button onClick={() => toggleMenu('pengurusan')} className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors group outline-none">
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-widest group-hover:text-orange-600 transition-colors">Pengurusan</span>
                <svg className={`w-4 h-4 text-slate-400 group-hover:text-orange-500 transition-transform duration-300 ${expanded.pengurusan ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
              </button>
              
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expanded.pengurusan ? 'max-h-60 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                <div className="space-y-1 pl-4 ml-4 border-l-2 border-slate-100 py-2">
                  {allowedModules.includes("hr") && (
                    <button onClick={() => navigate('/hr')} className={`w-full flex items-center px-4 py-2.5 rounded-xl font-bold transition-all text-sm ${pathname === '/hr' ? 'bg-orange-50 text-orange-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
                      HR & Payroll
                    </button>
                  )}
                  {allowedModules.includes("tasks") && (
                    <button onClick={() => navigate('/tasks')} className={`w-full flex items-center px-4 py-2.5 rounded-xl font-bold transition-all text-sm ${pathname === '/tasks' ? 'bg-orange-50 text-orange-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
                      Task Manager
                    </button>
                  )}
                  
                  {/* BUTANG 1: AKAUN SENDIRI (Semua staf ada) */}
                  {allowedModules.includes("account") && (
                    <button onClick={() => navigate('/account')} className={`w-full flex items-center px-4 py-2.5 rounded-xl font-bold transition-all text-sm ${pathname === '/account' ? 'bg-orange-50 text-orange-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
                      Akaun Sendiri
                    </button>
                  )}

                  {/* BUTANG 2: TETAPAN SISTEM ADMIN (Admin sahaja) */}
                  {allowedModules.includes("settings") && (
                    <button onClick={() => navigate('/settings')} className={`w-full flex items-center px-4 py-2.5 rounded-xl font-bold transition-all text-sm ${pathname === '/settings' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
                      Sistem Admin
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

        </nav>
        
        {/* LOG KELUAR */}
        <div className="p-6 border-t border-slate-100 mt-auto bg-slate-50/50 shrink-0">
          <button onClick={handleLogout} className="w-full flex items-center justify-center px-4 py-3 text-sm font-bold text-slate-600 bg-white hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors border border-slate-200 hover:border-red-200 shadow-sm">
            <svg className="w-5 h-5 mr-2 stroke-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Log Keluar
          </button>
        </div>
      </div>
    </>
  );
}