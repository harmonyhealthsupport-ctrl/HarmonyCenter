"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";

export default function CreatorDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // Data Mentah
  const [liveData, setLiveData] = useState([]);
  const [contentData, setContentData] = useState([]);
  const [offlineSalesData, setOfflineSalesData] = useState([]); // Dari CRM Utama
  const [begKuningData, setBegKuningData] = useState([]);

  // Filter
  const [filters, setFilters] = useState({
    month: new Date().getMonth() + 1, // Bulan Semasa
    year: new Date().getFullYear(),
    department: "All"
  });

  useEffect(() => {
    const fetchAllData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push("/login");

      const [resLive, resContent, resOffline, resBeg] = await Promise.all([
        supabase.from("live_stats").select("*"),
        supabase.from("content_stats").select("*"),
        supabase.from("sales").select("total_amount, sale_date, sales_person"),
        supabase.from("beg_kuning_stats").select("*")
      ]);

      if (resLive.data) setLiveData(resLive.data);
      if (resContent.data) setContentData(resContent.data);
      if (resOffline.data) setOfflineSalesData(resOffline.data);
      if (resBeg.data) setBegKuningData(resBeg.data);

      setLoading(false);
    };
    fetchAllData();
  }, [router]);

  // ==========================================
  // PENGIRAAN KPI BERDASARKAN FILTER BULAN/TAHUN
  // ==========================================
  
  // Fungsi Tapis Mengikut Tarikh
  const filterByDate = (dataArray, dateField) => {
    return dataArray.filter(item => {
      if (!item[dateField]) return false;
      const d = new Date(item[dateField]);
      const matchMonth = filters.month === "All" || (d.getMonth() + 1).toString() === filters.month.toString();
      const matchYear = d.getFullYear().toString() === filters.year.toString();
      return matchMonth && matchYear;
    });
  };

  const fLive = filterByDate(liveData, 'date');
  const fContent = filterByDate(contentData, 'date');
  const fOffline = filterByDate(offlineSalesData, 'sale_date');
  
  // KPI Keseluruhan
  const totalLiveGMV = fLive.reduce((sum, i) => sum + Number(i.gmv || 0), 0);
  const totalLiveHours = fLive.reduce((sum, i) => sum + Number(i.duration || 0), 0) / 60; // Tukar minit ke jam
  const totalContentSales = fContent.reduce((sum, i) => sum + Number(i.sales_amount || 0), 0);
  const totalViews = fContent.reduce((sum, i) => sum + Number(i.views || 0), 0);
  const totalOfflineSales = fOffline.reduce((sum, i) => sum + Number(i.total_amount || 0), 0);

  const totalAllSales = totalLiveGMV + totalContentSales + totalOfflineSales;
  const monthlyTarget = 50000; // Contoh Target Bulan Semasa
  const targetPercent = Math.min((totalAllSales / monthlyTarget) * 100, 100).toFixed(1);

  // Analitik Lanjutan
  const totalClicks = fContent.reduce((sum, i) => sum + Number(i.clicks || 0), 0);
  const clickRate = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(2) : 0;
  
  const totalConversions = fContent.reduce((sum, i) => sum + Number(i.conversions || 0), 0);
  const conversionRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(2) : 0;

  // LEADERBOARD INDIVIDU (Gabungan Semua Usaha)
  const staffScores = {};
  fLive.forEach(i => {
    const n = i.host_name || 'Unknown';
    staffScores[n] = (staffScores[n] || 0) + Number(i.gmv || 0);
  });
  fContent.forEach(i => {
    const n = i.creator_name || 'Unknown';
    staffScores[n] = (staffScores[n] || 0) + Number(i.sales_amount || 0);
  });
  fOffline.forEach(i => {
    const n = i.sales_person?.split('@')[0] || 'Unknown';
    staffScores[n] = (staffScores[n] || 0) + Number(i.total_amount || 0);
  });

  const topIndividuals = Object.entries(staffScores).sort((a,b) => b[1] - a[1]).slice(0, 5);
  const maxStaffScore = topIndividuals.length > 0 ? topIndividuals[0][1] : 1;

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-[#F4F7FE]"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>;

  return (
    <div className="flex h-screen bg-[#F4F7FE] font-sans text-slate-800">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        <Header title="Analytics System" subtitle="Papan pemuka prestasi komprehensif untuk Creator & Live Host." />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          
          {/* FILTER BAR */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
            <div className="flex items-center text-sm font-bold text-slate-500 mr-2">
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
              Filters:
            </div>
            <select value={filters.month} onChange={e=>setFilters({...filters, month: e.target.value})} className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-bold text-slate-700 outline-none shadow-sm min-w-[150px]">
              <option value="All">All Months</option>
              {Array.from({length: 12}, (_, i) => (<option key={i+1} value={i+1}>Bulan {i+1}</option>))}
            </select>
            <select value={filters.year} onChange={e=>setFilters({...filters, year: e.target.value})} className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-bold text-slate-700 outline-none shadow-sm min-w-[150px]">
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </select>
            <select value={filters.department} onChange={e=>setFilters({...filters, department: e.target.value})} className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-bold text-slate-700 outline-none shadow-sm min-w-[180px]">
              <option value="All">All Departments</option>
              <option value="Harmony Health">Harmony Health</option>
              <option value="Moyya">Moyya</option>
            </select>
          </div>

          {/* KPI UTAMA (PROGRESS BAR) */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-8">
            <div className="flex justify-between items-end mb-2">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  Monthly KPI Tracker
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Sumbangan Jualan Keseluruhan (Bulan Semasa)</p>
              </div>
              <h2 className="text-3xl font-black text-indigo-700">{targetPercent}%</h2>
            </div>
            
            <div className="w-full bg-slate-100 rounded-full h-4 my-3 overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{width: `${targetPercent}%`}}></div>
            </div>

            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-600">Terkumpul: RM {totalAllSales.toLocaleString('en-MY', {minimumFractionDigits: 2})}</span>
              <div className="text-right">
                <span className="text-slate-500">Target: RM {monthlyTarget.toLocaleString()}</span>
                {totalAllSales >= monthlyTarget && <p className="text-red-500 uppercase tracking-wider mt-1">🎉 TARGET ACHIEVED!</p>}
              </div>
            </div>
          </div>

          {/* KAD METRIK KECIL */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 border-t-4 border-t-purple-500">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center mb-2"><svg className="w-3.5 h-3.5 mr-1.5" fill="currentColor" viewBox="0 0 24 24"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2-2v8a2 2 0 002 2z"/></svg> Live GMV</p>
              <h3 className="text-2xl font-black text-purple-700">RM {totalLiveGMV.toLocaleString()}</h3>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 border-t-4 border-t-orange-500">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center mb-2"><svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Live Hours</p>
              <h3 className="text-2xl font-black text-orange-600">{totalLiveHours.toFixed(1)} Hrs</h3>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 border-t-4 border-t-blue-500">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center mb-2"><svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> Total Views</p>
              <h3 className="text-2xl font-black text-blue-600">{totalViews.toLocaleString()}</h3>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 border-t-4 border-t-emerald-500">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center mb-2"><svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> Offline Sales</p>
              <h3 className="text-2xl font-black text-emerald-600">RM {totalOfflineSales.toLocaleString()}</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center border-l-4 border-l-blue-400">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Avg. Click Rate (CTR)</p>
                <h3 className="text-2xl font-black text-blue-600">{clickRate}%</h3>
              </div>
              <svg className="w-8 h-8 text-blue-100" fill="currentColor" viewBox="0 0 24 24"><path d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-1.44-2.5M11.95 21.95l1.44-2.5M21.761 7.965l-.777 2.897M18.864 2.239l2.898-.777"/></svg>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center border-l-4 border-l-emerald-400">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Conversion Rate</p>
                <h3 className="text-2xl font-black text-emerald-600">{conversionRate}%</h3>
              </div>
              <svg className="w-8 h-8 text-emerald-100" fill="currentColor" viewBox="0 0 24 24"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
            </div>
          </div>

          {/* LEADERBOARD */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-7 mb-8">
            <h3 className="text-slate-800 text-sm font-extrabold uppercase tracking-wider mb-6 flex items-center">
              <svg className="w-5 h-5 mr-2 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
              Individual Leaderboard
            </h3>
            
            <div className="space-y-6">
              {topIndividuals.length > 0 ? topIndividuals.map((staff, index) => {
                const widthPercent = (staff[1] / maxStaffScore) * 100;
                return (
                  <div key={index} className="group relative">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center font-bold">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs mr-3 text-white ${index === 0 ? 'bg-amber-500 shadow-md shadow-amber-500/50' : index === 1 ? 'bg-slate-400' : index === 2 ? 'bg-orange-400' : 'bg-slate-200 text-slate-600'}`}>
                          {index + 1}
                        </span>
                        <span className="text-slate-700 uppercase tracking-wide text-sm">{staff[0]}</span>
                      </div>
                      <span className={`font-black ${index === 0 ? 'text-amber-600' : 'text-slate-600'}`}>RM {staff[1].toLocaleString('en-MY', {minimumFractionDigits: 2})}</span>
                    </div>
                    <div className="w-full bg-slate-50 rounded-full h-2 overflow-hidden border border-slate-100">
                      <div className={`h-full rounded-full transition-all duration-1000 ${index === 0 ? 'bg-amber-500' : 'bg-slate-300'}`} style={{width: `${widthPercent}%`}}></div>
                    </div>
                  </div>
                )
              }) : (
                <div className="text-center py-6 text-slate-400 text-sm font-bold">Tiada data jualan atau live ditemui untuk bulan ini.</div>
              )}
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}