"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const [loginId, setLoginId] = useState(""); 
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // STATE UNTUK FORGOT PASSWORD MODAL
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotUsername, setForgotUsername] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState({ type: "", text: "" });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const finalUsername = loginId.trim();

    if (finalUsername.includes('@')) {
      setErrorMsg("Please enter your Username only. Emails are not accepted.");
      setLoading(false);
      return;
    }

    const { data: userRecord } = await supabase
      .from('user_roles')
      .select('email')
      .ilike('display_name', finalUsername) 
      .maybeSingle();

    if (!userRecord || !userRecord.email) {
      setErrorMsg("Username not found. Please check your spelling.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: userRecord.email,
      password: password,
    });

    if (error) {
      setErrorMsg("Invalid username or password.");
      setLoading(false);
    } else {
      router.push("/dashboard"); 
    }
  };

  // FUNGSI MENGHANTAR LINK RESET PASSWORD
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotMsg({ type: "", text: "" });

    const finalUsername = forgotUsername.trim();

    if (finalUsername.includes('@')) {
      setForgotMsg({ type: "error", text: "Please enter your Username, not email." });
      setForgotLoading(false);
      return;
    }

    // 1. Cari e-mel staf berdasarkan Username
    const { data: userRecord } = await supabase
      .from('user_roles')
      .select('email')
      .ilike('display_name', finalUsername) 
      .maybeSingle();

    if (!userRecord || !userRecord.email) {
      setForgotMsg({ type: "error", text: "Username not found in our database." });
      setForgotLoading(false);
      return;
    }

    // 2. Arahkan Supabase hantar link reset ke e-mel tersebut
    const { error } = await supabase.auth.resetPasswordForEmail(userRecord.email, {
      redirectTo: `${window.location.origin}/update-password`, // Bawa pengguna ke halaman ini selepas klik link di e-mel
    });

    if (error) {
      setForgotMsg({ type: "error", text: "Failed to send email. Please try again." });
    } else {
      setForgotMsg({ type: "success", text: "Reset link sent! Please check your registered email inbox." });
      setForgotUsername("");
    }
    setForgotLoading(false);
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
              <Image src="/logo.png" alt="Company Logo" width={96} height={96} className="object-cover rounded-full" priority />
            </div>
          </div>
          <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight leading-tight">Harmony Health <br className="hidden lg:block"/> Management Center</h1>
          <p className="text-slate-600 text-sm lg:text-base max-w-md mx-auto font-medium hidden sm:block">Integrated operations platform for sales, inventory, and human resources management.</p>
        </div>
      </div>

      {/* Login Form Section */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 sm:px-16 md:px-24 py-12 bg-white z-20 relative">
        <div className="max-w-md w-full mx-auto space-y-8">
          
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold text-slate-900">Login</h2>
            <p className="text-slate-500 mt-2">Please enter your details to access the portal.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6 mt-8">
            {errorMsg && (
              <div className="flex items-center p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl shadow-sm text-red-700 transition-all duration-300">
                <span className="text-sm font-semibold">{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Username</label>
              <input type="text" value={loginId} onChange={(e) => setLoginId(e.target.value)} autoComplete="off" className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-900 placeholder-slate-400" placeholder="Enter your username" required />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className="w-full pl-4 pr-12 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-900 placeholder-slate-400" placeholder="••••••••" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center">
                <input id="remember-me" type="checkbox" className="h-4 w-4 text-blue-600 border-slate-300 rounded cursor-pointer" />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-600 cursor-pointer font-medium">Remember me</label>
              </div>
              <div className="text-sm">
                {/* BUTANG BUKA MODAL FORGOT PASSWORD */}
                <button type="button" onClick={() => setShowForgotModal(true)} className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                  Forgot password?
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className={`w-full flex justify-center py-3.5 px-4 rounded-xl shadow-lg text-sm font-bold text-white transition-all duration-300 ${loading ? "bg-blue-400 cursor-not-allowed" : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"}`}>
              {loading ? "Authenticating..." : "Login to Account"}
            </button>
          </form>
          
          <div className="mt-10 text-center lg:text-left text-sm text-slate-400 font-medium">
            &copy; 2026 Harmony Health Sdn Bhd Management System. All Rights Reserved.
          </div>
        </div>

        {/* MODAL FORGOT PASSWORD */}
        {showForgotModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-900">Reset Password</h3>
                <button onClick={() => setShowForgotModal(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
              </div>
              <div className="p-6">
                <p className="text-sm text-slate-500 mb-4">Enter your Username below. We will send a secure reset link to the email associated with this username.</p>
                
                {forgotMsg.text && (
                  <div className={`p-3 mb-4 rounded-lg text-sm font-semibold ${forgotMsg.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                    {forgotMsg.text}
                  </div>
                )}

                <form onSubmit={handleResetPassword}>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Username</label>
                  <input type="text" value={forgotUsername} onChange={(e) => setForgotUsername(e.target.value)} required placeholder="Enter your username" className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 mb-6 bg-slate-50" />
                  
                  <div className="flex justify-end space-x-3">
                    <button type="button" onClick={() => setShowForgotModal(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors">Cancel</button>
                    <button type="submit" disabled={forgotLoading} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors shadow-md shadow-blue-500/20">
                      {forgotLoading ? "Sending..." : "Send Reset Link"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
