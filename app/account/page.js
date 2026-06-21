"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";

export default function AccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Data Pengguna
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("ADMIN");

  // State Borang
  const [form, setForm] = useState({
    full_name: "",
    display_name: "",
    password: "",
    avatar_url: ""
  });

  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, [router]);

  const fetchUserData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return router.push("/login");

    setUserEmail(session.user.email);

    // Ambil profil dari jadual user_roles
    const { data: profile } = await supabase
      .from("user_roles")
      .select("role, full_name, display_name, avatar_url")
      .eq("email", session.user.email)
      .maybeSingle();

    if (profile) {
      setUserRole(profile.role ? profile.role.toUpperCase() : "ADMIN");
      setForm({
        full_name: profile.full_name || "",
        display_name: profile.display_name || "",
        password: "",
        avatar_url: profile.avatar_url || ""
      });
    }
    setLoading(false);
  };

  // ==========================================
  // FUNGSI MUAT NAIK GAMBAR PROFIL (AVATAR)
  // ==========================================
  const uploadAvatar = async (event) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Sila pilih gambar untuk dimuat naik.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${userEmail.split('@')[0]}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Muat naik ke Supabase Storage (Bucket: 'avatars')
      let { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;

      // Dapatkan URL public gambar tersebut
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      setForm({ ...form, avatar_url: data.publicUrl });
      alert("Gambar berjaya dimuat naik! Sila tekan 'Simpan Perubahan' untuk mengesahkan.");

    } catch (error) {
      alert("Ralat memuat naik gambar: " + error.message + "\n(Pastikan bucket 'avatars' telah dicipta di Supabase Storage dan diset 'Public')");
    } finally {
      setUploading(false);
    }
  };

  // ==========================================
  // FUNGSI SIMPAN PROFIL
  // ==========================================
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);

    try {
      // 1. Update jadual user_roles (Nama & Gambar)
      const { error: dbError } = await supabase
        .from("user_roles")
        .update({
          full_name: form.full_name.trim(),
          display_name: form.display_name.trim(),
          avatar_url: form.avatar_url
        })
        .eq("email", userEmail);

      if (dbError) throw dbError;

      // 2. Update Kata Laluan di Supabase Auth (Jika Diisi)
      if (form.password.trim() !== "") {
        if (form.password.length < 6) {
          alert("Kata laluan mestilah sekurang-kurangnya 6 aksara.");
          setSubmitLoading(false);
          return;
        }
        const { error: authError } = await supabase.auth.updateUser({
          password: form.password
        });
        if (authError) throw authError;
      }

      alert("Profil berjaya dikemas kini!");
      setForm({ ...form, password: "" }); // Kosongkan password lepas berjaya
      
      // Refresh page supaya gambar baru terpapar di Header
      window.location.reload();

    } catch (err) {
      alert("Ralat: " + err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div></div>;

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-800">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        <Header title="Tetapan Akaun" subtitle="Urus profil, gambar, dan keselamatan akaun anda." />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8 flex justify-center items-start">
          
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700 relative"></div>
            
            <div className="px-8 pb-8 relative">
              
              {/* BAHAGIAN GAMBAR PROFIL */}
              <div className="flex justify-between items-end mb-8 -mt-12 relative z-10">
                <div className="relative group">
                  {form.avatar_url ? (
                    <img src={form.avatar_url} alt="Profile" className="w-24 h-24 rounded-full border-4 border-white shadow-md object-cover bg-white" />
                  ) : (
                    <div className="w-24 h-24 rounded-full border-4 border-white shadow-md bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-500 font-black text-3xl">
                      {userEmail.charAt(0).toUpperCase()}
                    </div>
                  )}
                  
                  {/* BUTANG UPLOAD GAMBAR */}
                  <label className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full cursor-pointer shadow-lg transition-transform hover:scale-110">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <input type="file" accept="image/*" onChange={uploadAvatar} disabled={uploading} className="hidden" />
                  </label>
                </div>
                
                <div className="text-right pb-2">
                  <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase">
                    {userRole}
                  </span>
                </div>
              </div>

              {uploading && <p className="text-xs text-blue-600 font-bold mb-4 animate-pulse">Sedang memuat naik gambar...</p>}

              {/* BORANG KEMAS KINI */}
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Nama Penuh</label>
                    <input type="text" required placeholder="Nama rasmi anda" value={form.full_name} onChange={(e) => setForm({...form, full_name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm font-medium outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Nama Paparan (Username)</label>
                    <input type="text" required placeholder="Nama panggilan" value={form.display_name} onChange={(e) => setForm({...form, display_name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm font-bold text-slate-800 outline-none transition-all" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Alamat Emel (Log Masuk)</label>
                  <input type="email" disabled value={userEmail} className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-medium text-slate-500 cursor-not-allowed" />
                  <p className="text-[10px] text-slate-400 mt-1.5 font-semibold">Emel tidak boleh diubah untuk tujuan keselamatan sistem.</p>
                </div>

                <div className="border-t border-slate-100 pt-6">
                  <h4 className="text-sm font-extrabold text-slate-800 mb-4">Keselamatan Akaun</h4>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Kata Laluan Baru</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="Biarkan kosong jika tiada perubahan" 
                      value={form.password} 
                      onChange={(e) => setForm({...form, password: e.target.value})} 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm outline-none transition-all" 
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3.5 text-slate-400 hover:text-blue-500 transition-colors focus:outline-none">
                      {showPassword ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.025 10.025 0 014.132-5.4M9.88 9.88a3 3 0 104.24 4.24M1 1l22 22" /></svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => router.push('/dashboard')} className="px-6 py-3 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Batal</button>
                  <button type="submit" disabled={submitLoading || uploading} className="px-8 py-3 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-transform hover:-translate-y-0.5">
                    {submitLoading ? "Menyimpan..." : "Simpan Perubahan"}
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