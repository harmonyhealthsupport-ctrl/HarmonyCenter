"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";

export default function DailyAchievementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // States Data
  const [salesData, setSalesData] = useState([]);
  const [adSpendData, setAdSpendData] = useState([]);
  
  // State Filter & Tabs
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState("Sales Exec");

  // State Borang Ad Spend
  const [showAdModal, setShowAdModal] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [adForm, setAdForm] = useState({
    date: new Date().toISOString().split("T")[0],
    platform: "TikTok Ads",
    amount_spent: "",
    recorded_by: ""
  });

  useEffect(() => {
    fetchDailyData();
  }, [currentMonth, currentYear, router]);

  const fetchDailyData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return router.push("/login");

    const startDate = new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];

    const [resSales, resAdSpend] = await Promise.all([
      supabase.from("sales").select("*").gte("sale_date", startDate).lte("sale_date", endDate),
      supabase.from("ad_spend").select("*").gte("date", startDate).lte("date", endDate)
    ]);

    if (resSales.data) setSalesData(resSales.data);
    if (resAdSpend.data) setAdSpendData(resAdSpend.data);
    
    setLoading(false);
  };

  // ==========================================
  // FUNGSI SUBMIT AD SPEND
  // ==========================================
  const handleAdSpendSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);

    const { error } = await supabase.from("ad_spend").insert([{
      date: adForm.date,
      platform: adForm.platform,
      amount_spent: parseFloat(adForm.amount_spent) || 0,
      recorded_by: adForm.recorded_by.trim()
    }]);

    if (!error) {
      alert("Rekod perbelanjaan iklan berjaya disimpan!");
      setShowAdModal(false);
      setAdForm({ ...adForm, amount_spent: "" });
      fetchDailyData();
    } else {
      alert("Ralat menyimpan data: " + error.message);
    }
    setSubmitLoading(false);
  };

  // ==========================================
  // PENGIRAAN KPI MENGIKUT PERANAN (ROLE)
  // ==========================================

  // 1. KPI SALES EXEC (Leads, Repeat Cust, Blasting)
  const execSales = salesData.filter(s => ['Leads Ads', 'Blasting'].includes(s.sales_source) || s.customer_status === 'Repeat' || s.customer_status === 'Member' || s.customer_status === 'VIP');
  const execTotalRM = execSales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
  const execLeadsRM = salesData.filter(s => s.sales_source === 'Leads Ads').reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
  const execBlastingRM = salesData.filter(s => s.sales_source === 'Blasting').reduce((sum, s) => sum + Number(s.total_amount || 0), 0);

  // 2. KPI MARKETER (Ecom Ads, ROAS Ecom)
  const marketerSales = salesData.filter(s => s.sales_source === 'Ecom Ads');
  const marketerTotalRM = marketerSales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
  const marketerAdSpend = adSpendData.filter(a => a.platform === 'Ecom Ads').reduce((sum, a) => sum + Number(a.amount_spent || 0), 0);
  const marketerROAS = marketerAdSpend > 0 ? (marketerTotalRM / marketerAdSpend).toFixed(2) : 0;

  // 3. KPI TIKTOKER (TikTok Ads, ROAS TikTok)
  const tiktokSales = salesData.filter(s => s.sales_source === 'TikTok Ads');
  const tiktokTotalRM = tiktokSales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
  const tiktokAdSpend = adSpendData.filter(a => a.platform === 'TikTok Ads').reduce((sum, a) => sum + Number(a.amount_spent || 0), 0);
  const tiktokROAS = tiktokAdSpend > 0 ? (tiktokTotalRM / tiktokAdSpend).toFixed(2) : 0;

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-800">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        <Header title="Daily Achievement" subtitle="Pemantauan prestasi jualan dan pulangan iklan (ROAS) mengikut peranan." />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          
          {/* FILTER & TOP ACTION BAR */}
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 mb-8 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Laporan Bulan:</span>
              <select value={currentMonth} onChange={e => setCurrentMonth(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer">
                {Array.from({length: 12}, (_, i) => (<option key={i+1} value={i+1}>Bulan {i+1}</option>))}
              </select>
              <select value={currentYear} onChange={e => setCurrentYear(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer">
                <option value="2026">2026</option><option value="2025">2025</option>
              </select>
            </div>
            
            <button onClick={() => setShowAdModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-indigo-500/30 flex items-center transition-all text-sm shrink-0 hover:-translate-y-0.5">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Rekod Kos Iklan (Ad Spend)
            </button>
          </div>

          {/* ROLE TABS */}
          <div className="flex space-x-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-100 w-full overflow-x-auto mb-6">
            <button onClick={() => setActiveTab('Sales Exec')} className={`flex-1 px-6 py-3 rounded-xl font-black text-sm whitespace-nowrap transition-all ${activeTab === 'Sales Exec' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
              👨‍💼 Prestasi Sales Exec
            </button>
            <button onClick={() => setActiveTab('Marketer')} className={`flex-1 px-6 py-3 rounded-xl font-black text-sm whitespace-nowrap transition-all ${activeTab === 'Marketer' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
              📢 Prestasi Marketer
            </button>
            <button onClick={() => setActiveTab('Tiktoker')} className={`flex-1 px-6 py-3 rounded-xl font-black text-sm whitespace-nowrap transition-all ${activeTab === 'Tiktoker' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
              🎵 Prestasi Tiktokers
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-20"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>
          ) : (
            <div className="animate-in fade-in zoom-in-95 duration-200">
              
              {/* ==================== VIEW: SALES EXEC ==================== */}
              {activeTab === 'Sales Exec' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 border-t-4 border-t-blue-500">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Sales (Exec Scope)</p>
                      <h3 className="text-4xl font-black text-blue-600">RM {execTotalRM.toLocaleString('en-MY', {minimumFractionDigits: 2})}</h3>
                      <p className="text-[10px] text-slate-400 mt-2 font-semibold">Merangkumi jualan Leads, Repeat, & Blasting.</p>
                    </div>
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Jualan Leads Ads</p>
                      <h3 className="text-3xl font-black text-slate-700">RM {execLeadsRM.toLocaleString('en-MY', {minimumFractionDigits: 2})}</h3>
                    </div>
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Jualan WhatsApp Blasting</p>
                      <h3 className="text-3xl font-black text-slate-700">RM {execBlastingRM.toLocaleString('en-MY', {minimumFractionDigits: 2})}</h3>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 flex items-start">
                    <span className="text-2xl mr-4">💡</span>
                    <div>
                      <h4 className="font-bold text-blue-800 text-sm">Tindakan Sales Exec:</h4>
                      <p className="text-xs text-blue-600 mt-1">Pastikan follow-up Leads dilakukan dengan pantas dan ekstrak database pelanggan dari *Customer Database* untuk kempen blasting mingguan.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== VIEW: MARKETER ==================== */}
              {activeTab === 'Marketer' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 border-t-4 border-t-amber-500">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">ROAS Ecom Ads</p>
                      <h3 className="text-4xl font-black text-amber-500">{marketerROAS}x</h3>
                      <p className="text-[10px] text-slate-400 mt-2 font-semibold">Setiap RM1 dibakar memulangkan RM{marketerROAS}</p>
                    </div>
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Sales (Ecom)</p>
                      <h3 className="text-3xl font-black text-emerald-600">RM {marketerTotalRM.toLocaleString('en-MY', {minimumFractionDigits: 2})}</h3>
                    </div>
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 bg-red-50/30">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Budget Used (Ad Spend)</p>
                      <h3 className="text-3xl font-black text-red-500">RM {marketerAdSpend.toLocaleString('en-MY', {minimumFractionDigits: 2})}</h3>
                    </div>
                  </div>

                  <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 flex items-start">
                    <span className="text-2xl mr-4">🎯</span>
                    <div>
                      <h4 className="font-bold text-amber-800 text-sm">Fokus Marketer:</h4>
                      <p className="text-xs text-amber-700 mt-1">Pantau graf ROAS ini setiap hari. Jika ROAS jatuh bawah 2.0x, segera matikan kempen iklan atau tukar visual (*creatives*). Ekstrak data dari modul Profiling untuk buat 'Lookalike Audience'.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== VIEW: TIKTOKERS ==================== */}
              {activeTab === 'Tiktoker' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 border-t-4 border-t-slate-800">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">ROAS TikTok Ads</p>
                      <h3 className="text-4xl font-black text-slate-800">{tiktokROAS}x</h3>
                      <p className="text-[10px] text-slate-400 mt-2 font-semibold">Setiap RM1 dibakar memulangkan RM{tiktokROAS}</p>
                    </div>
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Sales (TikTok)</p>
                      <h3 className="text-3xl font-black text-emerald-600">RM {tiktokTotalRM.toLocaleString('en-MY', {minimumFractionDigits: 2})}</h3>
                    </div>
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 bg-red-50/30">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Budget Used (TikTok Ads)</p>
                      <h3 className="text-3xl font-black text-red-500">RM {tiktokAdSpend.toLocaleString('en-MY', {minimumFractionDigits: 2})}</h3>
                    </div>
                  </div>

                  <div className="bg-slate-100 p-5 rounded-2xl border border-slate-200 flex items-start">
                    <span className="text-2xl mr-4">📱</span>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">Fokus Tiktokers:</h4>
                      <p className="text-xs text-slate-600 mt-1">Pantau jualan harian dari profil TikTok, uruskan bajet Ads untuk menaikkan trafik ke Beg Kuning atau borang Leads. Hasilkan *Content* yang menyasarkan pengguna profil 'New' untuk tarik pasaran baru.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* SEJARAH REKOD AD SPEND DI BAWAH KAD KPI */}
              <div className="mt-8 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">Log Perbelanjaan Iklan Bulan Ini</h3>
                </div>
                <div className="overflow-x-auto custom-scrollbar max-h-64">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-white text-slate-400 text-[10px] uppercase tracking-widest sticky top-0 border-b border-slate-100">
                      <tr><th className="px-6 py-3 font-bold">Tarikh</th><th className="px-6 py-3 font-bold">Platform Iklan</th><th className="px-6 py-3 font-bold text-right">Jumlah Bakar (RM)</th><th className="px-6 py-3 font-bold text-center">PIC (Direkod Oleh)</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {adSpendData.length > 0 ? adSpendData.sort((a,b)=>new Date(b.date)-new Date(a.date)).map((ad) => (
                        <tr key={ad.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-3 font-bold text-slate-600">{new Date(ad.date).toLocaleDateString('ms-MY')}</td>
                          <td className="px-6 py-3 font-black text-slate-800">{ad.platform}</td>
                          <td className="px-6 py-3 text-right font-black text-red-500">RM {Number(ad.amount_spent).toLocaleString('en-MY', {minimumFractionDigits: 2})}</td>
                          <td className="px-6 py-3 text-center text-xs font-bold text-slate-500">{ad.recorded_by || "System"}</td>
                        </tr>
                      )) : <tr><td colSpan="4" className="p-8 text-center text-slate-400 font-medium text-xs">Tiada rekod kos iklan direkodkan setakat ini.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </main>

        {/* MODAL: BORANG KOS IKLAN (AD SPEND) */}
        {showAdModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-extrabold text-lg text-slate-900 flex items-center">💸 Masukkan Kos Iklan</h3>
                <button onClick={() => setShowAdModal(false)} className="text-slate-400 hover:text-slate-600 font-black text-xl focus:outline-none">&times;</button>
              </div>
              <form onSubmit={handleAdSpendSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Tarikh Iklan Dijalankan</label>
                  <input type="date" required value={adForm.date} onChange={e => setAdForm({...adForm, date: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Platform Iklan</label>
                  <select value={adForm.platform} onChange={e => setAdForm({...adForm, platform: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="TikTok Ads">TikTok Ads</option>
                    <option value="Ecom Ads">Ecom Ads (FB/IG/Google)</option>
                    <option value="Leads Ads">Leads Ads</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Jumlah Bajet Dibakar (RM)</label>
                  <input type="number" step="0.01" required placeholder="Cth: 150.00" value={adForm.amount_spent} onChange={e => setAdForm({...adForm, amount_spent: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-black text-red-500 outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Nama Staf / PIC</label>
                  <input type="text" required placeholder="Masukkan nama anda" value={adForm.recorded_by} onChange={e => setAdForm({...adForm, recorded_by: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                
                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                  <button type="button" onClick={() => setShowAdModal(false)} className="px-5 py-3 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200">Batal</button>
                  <button type="submit" disabled={submitLoading} className="px-6 py-3 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-500/30">{submitLoading ? "Menyimpan..." : "Simpan Rekod"}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}