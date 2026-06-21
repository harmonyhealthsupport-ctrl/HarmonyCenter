"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";

export default function CreatorLibraryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // State Data
  const [contentData, setContentData] = useState([]);
  const [liveData, setLiveData] = useState([]);
  const [begKuningData, setBegKuningData] = useState([]);
  
  // Tab Semasa ('content', 'live', 'begkuning')
  const [activeTab, setActiveTab] = useState("content");
  
  // State Carian & Modal
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // State Borang Universal
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    title_or_name: "", // Guna untuk tajuk video / nama produk
    staff_name: "", // Guna untuk nama creator / host
    department: "Harmony Health",
    metric_1: "", // Views / Duration(min)
    metric_2: "", // Likes
    sales: "", // RM Jualan / GMV
    orders: "" // Parcel / Conversions
  });

  useEffect(() => {
    fetchLibraryData();
  }, [router]);

  const fetchLibraryData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return router.push("/login");

    const [resContent, resLive, resBegKuning] = await Promise.all([
      supabase.from("content_stats").select("*").order("date", { ascending: false }),
      supabase.from("live_stats").select("*").order("date", { ascending: false }),
      supabase.from("beg_kuning_stats").select("*").order("date", { ascending: false })
    ]);

    if (resContent.data) setContentData(resContent.data);
    if (resLive.data) setLiveData(resLive.data);
    if (resBegKuning.data) setBegKuningData(resBegKuning.data);

    setLoading(false);
  };

  // ==========================================
  // FUNGSI SIMPAN REKOD BARU (DINAMIK)
  // ==========================================
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);

    let error = null;

    if (activeTab === 'content') {
      const { error: err } = await supabase.from("content_stats").insert([{
        date: form.date, video_title: form.title_or_name, creator_name: form.staff_name, department: form.department,
        views: parseInt(form.metric_1) || 0, likes: parseInt(form.metric_2) || 0, sales_amount: parseFloat(form.sales) || 0, conversions: parseInt(form.orders) || 0
      }]);
      error = err;
    } 
    else if (activeTab === 'live') {
      const { error: err } = await supabase.from("live_stats").insert([{
        date: form.date, host_name: form.staff_name, department: form.department,
        duration: parseInt(form.metric_1) || 0, gmv: parseFloat(form.sales) || 0, orders: parseInt(form.orders) || 0
      }]);
      error = err;
    } 
    else if (activeTab === 'begkuning') {
      const { error: err } = await supabase.from("beg_kuning_stats").insert([{
        date: form.date, staff_name: form.staff_name, department: form.department, product_name: form.title_or_name,
        sales_rm: parseFloat(form.sales) || 0, total_orders: parseInt(form.orders) || 0
      }]);
      error = err;
    }

    if (!error) {
      alert("Rekod berjaya disimpan!");
      setShowModal(false);
      setForm({ date: new Date().toISOString().split("T")[0], title_or_name: "", staff_name: "", department: "Harmony Health", metric_1: "", metric_2: "", sales: "", orders: "" });
      fetchLibraryData();
    } else {
      alert("Gagal menyimpan rekod: " + error.message);
    }
    setSubmitLoading(false);
  };

  // FUNGSI PADAM REKOD
  const deleteRecord = async (table, id) => {
    if (!confirm("Adakah anda pasti mahu memadam rekod ini secara kekal?")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (!error) fetchLibraryData();
    else alert("Gagal memadam rekod: " + error.message);
  };

  const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : "-";

  // LOGIK CARIAN (SEARCH FILTER)
  const filteredContent = contentData.filter(i => (i.video_title?.toLowerCase() || "").includes(searchQuery.toLowerCase()) || (i.creator_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()));
  const filteredLive = liveData.filter(i => (i.host_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()));
  const filteredBegKuning = begKuningData.filter(i => (i.product_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) || (i.staff_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>;

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-800">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        <Header title="Data Library" subtitle="Pusat simpanan rekod dan sejarah prestasi TikTok & Creator." />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            {/* TABS SWITCHER */}
            <div className="flex space-x-2 bg-white p-1.5 rounded-xl shadow-sm border border-slate-200 w-full md:w-auto overflow-x-auto">
              <button onClick={() => setActiveTab('content')} className={`px-5 py-2.5 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${activeTab === 'content' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>📹 Rekod Content</button>
              <button onClick={() => setActiveTab('live')} className={`px-5 py-2.5 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${activeTab === 'live' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>🔴 Rekod Live Host</button>
              <button onClick={() => setActiveTab('begkuning')} className={`px-5 py-2.5 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${activeTab === 'begkuning' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>🛒 Rekod Beg Kuning</button>
            </div>

            {/* CARIAN & BUTANG TAMBAH */}
            <div className="flex gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <input type="text" placeholder="Cari data..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm" />
                <svg className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <button onClick={() => setShowModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-md flex items-center transition-all text-sm shrink-0">
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                Tambah Rekod
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="overflow-x-auto">
              
              {/* JADUAL 1: CONTENT VIDEO */}
              {activeTab === 'content' && (
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider">
                    <tr><th className="px-6 py-4 font-bold">Tarikh & Tajuk</th><th className="px-6 py-4 font-bold">Creator / Dept</th><th className="px-6 py-4 font-bold">Metrik Prestasi</th><th className="px-6 py-4 font-bold">Jualan (RM)</th><th className="px-6 py-4 font-bold text-center">Tindakan</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredContent.length > 0 ? filteredContent.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4"><div className="text-xs text-indigo-500 font-bold mb-1">{formatDate(item.date)}</div><div className="font-extrabold text-slate-800 text-wrap max-w-xs">{item.video_title}</div></td>
                        <td className="px-6 py-4"><div className="font-bold text-slate-700 uppercase">{item.creator_name}</div><div className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">{item.department || "Harmony Health"}</div></td>
                        <td className="px-6 py-4"><div className="flex gap-4 text-xs font-semibold text-slate-600"><span>👁️ {item.views?.toLocaleString()} Views</span><span>❤️ {item.likes?.toLocaleString()} Likes</span></div></td>
                        <td className="px-6 py-4"><div className="font-black text-emerald-600">RM {Number(item.sales_amount || 0).toLocaleString('en-MY', {minimumFractionDigits:2})}</div><div className="text-[10px] text-slate-400 font-semibold">{item.conversions || 0} Orders</div></td>
                        <td className="px-6 py-4 text-center"><button onClick={() => deleteRecord('content_stats', item.id)} className="text-red-400 hover:bg-red-50 p-2 rounded-lg transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></td>
                      </tr>
                    )) : <tr><td colSpan="5" className="p-10 text-center text-slate-400 font-medium">Tiada rekod content dijumpai.</td></tr>}
                  </tbody>
                </table>
              )}

              {/* JADUAL 2: LIVE HOST */}
              {activeTab === 'live' && (
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider">
                    <tr><th className="px-6 py-4 font-bold">Tarikh Sesi</th><th className="px-6 py-4 font-bold">Live Host</th><th className="px-6 py-4 font-bold">Tempoh (Masa)</th><th className="px-6 py-4 font-bold">Prestasi Jualan</th><th className="px-6 py-4 font-bold text-center">Tindakan</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredLive.length > 0 ? filteredLive.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-700">{formatDate(item.date)}</td>
                        <td className="px-6 py-4"><div className="font-bold text-slate-800 uppercase">{item.host_name}</div><div className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">{item.department || "Harmony Health"}</div></td>
                        <td className="px-6 py-4 text-slate-600 font-semibold">{(item.duration / 60).toFixed(1)} Jam <span className="text-slate-400 font-normal text-xs ml-1">({item.duration} min)</span></td>
                        <td className="px-6 py-4"><div className="font-black text-indigo-600">RM {Number(item.gmv || 0).toLocaleString('en-MY', {minimumFractionDigits:2})} <span className="text-xs text-indigo-400 font-bold ml-1">GMV</span></div><div className="text-[10px] text-slate-400 font-semibold">{item.orders || 0} Orders (Parcel)</div></td>
                        <td className="px-6 py-4 text-center"><button onClick={() => deleteRecord('live_stats', item.id)} className="text-red-400 hover:bg-red-50 p-2 rounded-lg transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></td>
                      </tr>
                    )) : <tr><td colSpan="5" className="p-10 text-center text-slate-400 font-medium">Tiada rekod live dijumpai.</td></tr>}
                  </tbody>
                </table>
              )}

              {/* JADUAL 3: BEG KUNING */}
              {activeTab === 'begkuning' && (
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider">
                    <tr><th className="px-6 py-4 font-bold">Tarikh</th><th className="px-6 py-4 font-bold">Staf / Dept</th><th className="px-6 py-4 font-bold">Nama Produk</th><th className="px-6 py-4 font-bold">Jualan (RM)</th><th className="px-6 py-4 font-bold text-center">Tindakan</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredBegKuning.length > 0 ? filteredBegKuning.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-700">{formatDate(item.date)}</td>
                        <td className="px-6 py-4"><div className="font-bold text-slate-800 uppercase">{item.staff_name}</div><div className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">{item.department || "Harmony Health"}</div></td>
                        <td className="px-6 py-4 text-slate-700 font-semibold"><span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-[10px] font-black mr-2 tracking-wider">BEG KUNING</span>{item.product_name}</td>
                        <td className="px-6 py-4"><div className="font-black text-emerald-600">RM {Number(item.sales_rm || 0).toLocaleString('en-MY', {minimumFractionDigits:2})}</div><div className="text-[10px] text-slate-400 font-semibold">{item.total_orders || 0} Orders</div></td>
                        <td className="px-6 py-4 text-center"><button onClick={() => deleteRecord('beg_kuning_stats', item.id)} className="text-red-400 hover:bg-red-50 p-2 rounded-lg transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></td>
                      </tr>
                    )) : <tr><td colSpan="5" className="p-10 text-center text-slate-400 font-medium">Tiada rekod beg kuning dijumpai.</td></tr>}
                  </tbody>
                </table>
              )}

            </div>
          </div>
        </main>

        {/* ========================================================= */}
        {/* MODAL: BORANG TAMBAH REKOD (DINAMIK) */}
        {/* ========================================================= */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-extrabold text-lg text-slate-900 flex items-center">
                  {activeTab === 'content' ? '📹 Tambah Rekod Content' : activeTab === 'live' ? '🔴 Tambah Rekod Live' : '🛒 Tambah Rekod Beg Kuning'}
                </h3>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 font-black text-xl focus:outline-none">&times;</button>
              </div>
              
              <form onSubmit={handleSubmitForm} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tarikh</label>
                    <input type="date" required value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Jabatan / Dept</label>
                    <select value={form.department} onChange={e => setForm({...form, department: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="Harmony Health">Harmony Health</option><option value="HQ">HQ</option><option value="Marketing">Marketing</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                    {activeTab === 'content' ? 'Nama Creator' : activeTab === 'live' ? 'Nama Live Host' : 'Nama Staf Affiliate'}
                  </label>
                  <input type="text" required placeholder="Masukkan nama..." value={form.staff_name} onChange={e => setForm({...form, staff_name: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                {activeTab !== 'live' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                      {activeTab === 'content' ? 'Tajuk Video' : 'Nama Produk'}
                    </label>
                    <input type="text" required placeholder="Masukkan tajuk/nama..." value={form.title_or_name} onChange={e => setForm({...form, title_or_name: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {activeTab !== 'begkuning' && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">{activeTab === 'content' ? 'Total Views' : 'Durasi (Minit)'}</label>
                        <input type="number" required placeholder="0" value={form.metric_1} onChange={e => setForm({...form, metric_1: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      {activeTab === 'content' && (
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Total Likes</label>
                          <input type="number" required placeholder="0" value={form.metric_2} onChange={e => setForm({...form, metric_2: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                      )}
                    </>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Total Sales (RM)</label>
                    <input type="number" step="0.01" required placeholder="0.00" value={form.sales} onChange={e => setForm({...form, sales: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">{activeTab === 'live' ? 'Jumlah Order / Parcel' : 'Conversions / Order'}</label>
                    <input type="number" required placeholder="0" value={form.orders} onChange={e => setForm({...form, orders: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                  <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200">Batal</button>
                  <button type="submit" disabled={submitLoading} className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-500/30 transition-transform hover:-translate-y-0.5">
                    {submitLoading ? "Menyimpan..." : "Simpan Rekod"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}