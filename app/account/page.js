"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";

export default function AccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);

  // States untuk Tukar Kata Laluan
  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push("/login");

      const { data: profile } = await supabase
        .from("user_roles")
        .select("*")
        .eq("email", session.user.email)
        .maybeSingle();

      if (profile) {
        setUserProfile(profile);
      } else {
        // Fallback sekiranya profil dalam user_roles tidak dijumpai
        setUserProfile({
          email: session.user.email,
          full_name: "Pengguna Harmony",
          role: "User",
          department: "Umum"
        });
      }
      setLoading(false);
    };

    fetchUserData();
  }, [router]);

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return alert("Ralat: Kata laluan baharu dan pengesahan tidak sepadan!");
    }
    if (passwordForm.newPassword.length < 6) {
      return alert("Ralat: Kata laluan mesti mengandungi sekurang-kurangnya 6 aksara.");
    }

    setPasswordLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: passwordForm.newPassword
    });

    if (!error) {
      alert("Tahniah! Kata laluan anda telah berjaya dikemas kini.");
      setPasswordForm({ newPassword: "", confirmPassword: "" });
    } else {
      alert("Ralat mengemaskini kata laluan: " + error.message);
    }
    setPasswordLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F4F7FE]">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F4F7FE] font-sans text-slate-800">
      <Sidebar />

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <Header title="Akaun & Profil Anda" subtitle="Pusat kawalan butiran diri dan keselamatan log masuk." />

        <main className="flex-1 overflow-y-auto p-6 lg:px-10 pb-20">
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* KAD 1: MAKLUMAT PROFIL */}
            <div className="bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-50">
                <h2 className="text-lg font-bold text-slate-900 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  Butiran Profil
                </h2>
              </div>
              <div className="p-6">
                <div className="flex items-center space-x-6 mb-8">
                  <div className="h-24 w-24 overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-black text-3xl shadow-inner border-4 border-slate-50">
                    {userProfile?.avatar_url ? (
                      <img src={userProfile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      userProfile?.display_name ? userProfile.display_name.charAt(0).toUpperCase() : userProfile?.full_name?.charAt(0).toUpperCase() || "U"
                    )}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800">{userProfile?.full_name}</h3>
                    <p className="text-sm font-semibold text-slate-500 mt-1">{userProfile?.email}</p>
                    <span className="inline-block mt-2 px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-md uppercase tracking-wider">
                      {userProfile?.role}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nama Panggilan</span>
                    <span className="text-sm font-bold text-slate-800">{userProfile?.display_name || "-"}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Jabatan (Department)</span>
                    <span className="text-sm font-bold text-slate-800">{userProfile?.department || "-"}</span>
                  </div>
                  <div className="md:col-span-2">
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Modul Akses</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {userProfile?.modules?.length > 0 ? (
                        userProfile.modules.map(m => (
                          <span key={m} className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg shadow-sm">
                            {m}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm font-medium text-slate-500">Akses terhad.</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* KAD 2: KESELAMATAN & KATA LALUAN */}
            <div className="bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-50">
                <h2 className="text-lg font-bold text-slate-900 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  Tukar Kata Laluan
                </h2>
                <p className="text-xs font-semibold text-slate-500 mt-1">Sila kemas kini kata laluan anda untuk keselamatan akaun.</p>
              </div>
              
              <form onSubmit={handlePasswordUpdate} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="relative">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Kata Laluan Baharu</label>
                    <input 
                      type={showPassword ? "text" : "password"} required minLength="6"
                      value={passwordForm.newPassword} 
                      onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})} 
                      placeholder="Taip sekurang-kurangnya 6 aksara..." 
                      className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 text-sm outline-none transition-all" 
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-9 text-slate-400 hover:text-slate-600 focus:outline-none">
                      {showPassword ? (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>) : (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>)}
                    </button>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Sahkan Kata Laluan</label>
                    <input 
                      type={showPassword ? "text" : "password"} required minLength="6"
                      value={passwordForm.confirmPassword} 
                      onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} 
                      placeholder="Ulang kata laluan baharu..." 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 text-sm outline-none transition-all" 
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button type="submit" disabled={passwordLoading} className="px-8 py-3 rounded-xl font-bold text-white bg-slate-800 hover:bg-slate-900 transition-colors shadow-lg shadow-slate-200 text-sm">
                    {passwordLoading ? "Memproses..." : "Kemas Kini Kata Laluan"}
                  </button>
                </div>
              </form>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}