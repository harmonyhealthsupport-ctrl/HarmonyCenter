"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Image from "next/image";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Pastikan pengguna tiba di halaman ini melalui link rasmi Supabase
  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event == "PASSWORD_RECOVERY") {
        console.log("Password recovery session active.");
      }
    });
  }, []);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    // Fungsi arahan Supabase untuk kemaskini Password
    const { error } = await supabase.auth.updateUser({ password: password });

    if (error) {
      setErrorMsg("Error updating password: " + error.message);
    } else {
      setSuccessMsg("Password updated successfully! Redirecting to login...");
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 p-8">
        <div className="flex justify-center mb-6">
          <Image src="/logo.png" alt="Company Logo" width={80} height={80} className="object-cover rounded-full" />
        </div>
        <h2 className="text-2xl font-bold text-center text-slate-900 mb-2">Create New Password</h2>
        <p className="text-center text-slate-500 mb-8 text-sm">Please enter a strong new password for your account.</p>

        {errorMsg && <div className="p-3 mb-4 text-sm font-bold bg-red-50 text-red-600 rounded-lg border border-red-100 text-center">{errorMsg}</div>}
        {successMsg && <div className="p-3 mb-4 text-sm font-bold bg-green-50 text-green-600 rounded-lg border border-green-100 text-center">{successMsg}</div>}

        <form onSubmit={handleUpdatePassword} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">New Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-900" placeholder="Enter new password" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Confirm New Password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-900" placeholder="Confirm new password" />
          </div>
          <button type="submit" disabled={loading} className={`w-full py-3.5 px-4 rounded-xl shadow-md text-sm font-bold text-white transition-all ${loading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}>
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}