"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const [loginId, setLoginId] = useState(""); // Tukar dari email ke loginId
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    let finalEmail = loginId.trim();

    // LOGIK BARU: Jika pengguna tak letak '@', kita anggap ia adalah Username
    if (!finalEmail.includes('@')) {
      // Cari e-mel yang sepadan dengan Username (display_name) di database
      const { data: userRecord, error: fetchError } = await supabase
        .from('user_roles')
        .select('email')
        .ilike('display_name', finalEmail) // Guna ilike supaya tak kisah huruf besar/kecil
        .maybeSingle();

      if (userRecord && userRecord.email) {
        finalEmail = userRecord.email; // Tukar username jadi e-mel sebenar
      } else {
        setErrorMsg("Username not found. Please check your spelling.");
        setLoading(false);
        return;
      }
    }

    // Hantar request login ke Supabase guna e-mel yang dah diproses
    const { data, error } = await supabase.auth.signInWithPassword({
      email: finalEmail,
      password: password,
    });

    if (error) {
      setErrorMsg("Invalid username or password. Please try again.");
      setLoading(false);
    } else {
      router.push("/dashboard"); 
    }
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    alert("The Forgot Password feature is currently under development.");
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-white">
      
      {/* Branding Section */}
      <div className="lg:w-1/2 bg-slate-50 flex flex-col justify-center items-center p-8 lg:p-12 relative overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-200">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-300 rounded-full blur-[120px] opacity-60"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-300 rounded-full blur-[120px] opacity-50"></div>
        <div className="absolute top-[40%] left-[20%] w-80 h-80 bg-sky-200 rounded-full blur-[100px] opacity-60"></div>
        
        <div className="relative z-10 text-center px-4">
          <div className="mb-8 flex items-center justify-center">
            <div className="bg-white/70 backdrop-blur-md border border-white p-2 rounded-full shadow-xl shadow-blue-900/5">
              <Image 
                src="/logo.png"
                alt="Company Logo" 
                width={96}
                height={96}
                className="object-cover rounded-full"
                priority
              />
            </div>
          </div>
          <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight leading-tight">
            Harmony Health <br className="hidden lg:block"/> Management Center
          </h1>
          <p className="text-slate-600 text-sm lg:text-base max-w-md mx-auto font-medium hidden sm:block">
            Integrated operations platform for sales, inventory, and human resources management.
          </p>
        </div>
      </div>

      {/* Login Form Section */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 sm:px-16 md:px-24 py-12 bg-white z-20">
        <div className="max-w-md w-full mx-auto space-y-8">
          
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold text-slate-900">Login</h2>
            <p className="text-slate-500 mt-2">Please enter your details to access the portal.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6 mt-8">
            
            {errorMsg && (
              <div className="flex items-center p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl shadow-sm text-red-700 transition-all duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-semibold">{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Username or Email</label>
              <input
                type="text" // Tukar dari email ke text supaya boleh masuk username
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-slate-50 text-slate-900 placeholder-slate-400"
                placeholder="kimal12"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
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
                  Remember me
                </label>
              </div>
              <div className="text-sm">
                <a href="#" onClick={handleForgotPassword} className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                  Forgot password?
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
              {loading ? "Authenticating..." : "Login to Account"}
            </button>
          </form>
          
          <div className="mt-10 text-center lg:text-left text-sm text-slate-400 font-medium">
            &copy; 2026 Harmony Health Sdn Bhd Management System. All Rights Reserved.
          </div>
        </div>
      </div>
      
    </div>
  );
}
