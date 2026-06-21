"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    // Hantar request login ke Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      setErrorMsg("E-mel atau kata laluan tidak sah. Sila cuba lagi.");
      setLoading(false);
    } else {
      // Jika berjaya, bawa pengguna ke halaman Dashboard
      router.push("/dashboard"); 
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-white">
      
      {/* Bahagian Penjenamaan (Kiri) */}
      <div className="lg:w-1/2 bg-slate-50 flex flex-col justify-center items-center p-8 lg:p-12 relative overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-200">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-300 rounded-full blur-[120px] opacity-60"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-300 rounded-full blur-[120px] opacity-50"></div>
        <div className="absolute top-[40%] left-[20%] w-80 h-80 bg-sky-200 rounded-full blur-[100px] opacity-60"></div>
        
        <div className="relative z-10 text-center px-4">
          <div className="mb-8 flex items-center justify-center">
            <div className="bg-white/70 backdrop-blur-md border border-white p-2 rounded-full shadow-xl shadow-blue-900/5">
              <Image 
                src="/logo.png"
                alt="Logo Syarikat" 
                width={96}
                height={96}
                className="object-cover rounded-full"
                priority
              />
            </div>
          </div>
          <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight leading-tight">
            Harmony <br className="hidden lg:block"/> Command Center
          </h1>
          <p className="text-slate-600 text-sm lg:text-base max-w-md mx-auto font-medium hidden sm:block">
            Platform operasi sepadu untuk pengurusan jualan, inventori, dan sumber manusia.
          </p>
        </div>
      </div>

      {/* Bahagian Borang Log Masuk (Kanan) */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 sm:px-16 md:px-24 py-12 bg-white z-20">
        <div className="max-w-md w-full mx-auto space-y-8">
          
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold text-slate-900">Log Masuk</h2>
            <p className="text-slate-500 mt-2">Sila masukkan butiran untuk mengakses portal.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6 mt-8">
            
            {/* PAPARAN MESEJ ERROR YANG BARU & KEMAS */}
            {errorMsg && (
              <div className="flex items-center p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl shadow-sm text-red-700 transition-all duration-300">
                {/* Ikon Amaran (SVG) */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-semibold">{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">E-mel Pekerja</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-slate-50 text-slate-900 placeholder-slate-400"
                placeholder="nama@syarikat.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Kata Laluan</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-slate-50 text-slate-900 placeholder-slate-400"
                placeholder="••••••••"
                required
              />
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center">
                <input id="remember-me" type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 bg-white rounded cursor-pointer transition-colors" />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-600 cursor-pointer font-medium">
                  Ingat saya
                </label>
              </div>
              <div className="text-sm">
                <a href="#" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                  Lupa kata laluan?
                </a>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-blue-500/30 text-sm font-bold text-white transition-all duration-300 ${
                loading ? "bg-blue-400 cursor-not-allowed" : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              }`}
            >
              {loading ? "Sedang Mengesahkan..." : "Log Masuk Akaun"}
            </button>
          </form>
          
          <div className="mt-10 text-center lg:text-left text-sm text-slate-400 font-medium">
            &copy; 2026 Harmony Command Center. Hak Cipta Terpelihara.
          </div>
        </div>
      </div>
      
    </div>
  );
}