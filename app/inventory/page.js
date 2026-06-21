"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";

export default function InventoryDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("transaction");
  const [logs, setLogs] = useState([]);
  const [balances, setBalances] = useState([]);
  const [submitLoading, setSubmitLoading] = useState(false);

  // State Form Dikemaskini dengan person_category
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    flow_type: "In",
    item_name: "",
    category: "Produk Siap",
    quantity: "",
    person_category: "Customer", // BARU (Ikut Draf PDF)
    person_name: "",
    biz_type: "HQ"
  });

  const [filters, setFilters] = useState({ search: "", biz_type: "All" });

  useEffect(() => {
    fetchInventoryData();
  }, [router]);

  const fetchInventoryData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return router.push("/login");

    const [resLogs, resItems] = await Promise.all([
      supabase.from("inventory_logs").select("*").order("created_at", { ascending: false }),
      supabase.from("inventory_items").select("*").order("item_name", { ascending: true })
    ]);

    if (resLogs.data) setLogs(resLogs.data);
    if (resItems.data) setBalances(resItems.data);
    setLoading(false);
  };

  const handleTransactionSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);

    const qty = parseInt(form.quantity);
    if (!qty || qty <= 0) {
      alert("Kuantiti mesti lebih dari 0");
      setSubmitLoading(false);
      return;
    }

    // Gabungkan Kategori dan Nama ke dalam pangkalan data
    const formattedPersonName = `[${form.person_category}] ${form.person_name.trim()}`;

    const { error: logError } = await supabase.from("inventory_logs").insert([{
      date: form.date,
      flow_type: form.flow_type,
      item_name: form.item_name.trim(),
      category: form.category,
      quantity: qty,
      person_name: formattedPersonName,
      biz_type: form.biz_type
    }]);

    if (logError) {
      alert("Ralat menyimpan log: " + logError.message);
      setSubmitLoading(false);
      return;
    }

    const existingItem = balances.find(b => b.item_name.toLowerCase() === form.item_name.trim().toLowerCase());

    if (existingItem) {
      const newIn = form.flow_type === "In" ? existingItem.total_in + qty : existingItem.total_in;
      const newOut = form.flow_type === "Out" ? existingItem.total_out + qty : existingItem.total_out;
      const newBalance = form.flow_type === "In" ? existingItem.current_balance + qty : existingItem.current_balance - qty;

      await supabase.from("inventory_items")
        .update({ total_in: newIn, total_out: newOut, current_balance: newBalance, category: form.category })
        .eq("id", existingItem.id);
    } else {
      await supabase.from("inventory_items").insert([{
        item_name: form.item_name.trim(),
        category: form.category,
        total_in: form.flow_type === "In" ? qty : 0,
        total_out: form.flow_type === "Out" ? qty : 0,
        current_balance: form.flow_type === "In" ? qty : -qty
      }]);
    }

    alert("Transaksi berjaya direkodkan!");
    setForm({ ...form, item_name: "", quantity: "", person_name: "" });
    fetchInventoryData();
    setSubmitLoading(false);
  };

  const deleteLog = async (logId, itemName, flowType, qty) => {
    if (!confirm("Padam rekod ini? Baki stok akan dikira semula secara automatik.")) return;
    await supabase.from("inventory_logs").delete().eq("id", logId);
    const item = balances.find(b => b.item_name === itemName);
    if (item) {
      const newIn = flowType === "In" ? item.total_in - qty : item.total_in;
      const newOut = flowType === "Out" ? item.total_out - qty : item.total_out;
      const newBalance = flowType === "In" ? item.current_balance - qty : item.current_balance + qty;
      await supabase.from("inventory_items").update({ total_in: newIn, total_out: newOut, current_balance: newBalance }).eq("id", item.id);
    }
    fetchInventoryData();
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const filteredLogs = logs.filter(log => {
    const matchSearch = (log.item_name?.toLowerCase() || "").includes(filters.search.toLowerCase()) || 
                        (log.person_name?.toLowerCase() || "").includes(filters.search.toLowerCase());
    const matchBiz = filters.biz_type === "All" || log.biz_type === filters.biz_type;
    return matchSearch && matchBiz;
  });

  const copyHistoryReport = () => {
    if (filteredLogs.length === 0) return alert("Tiada rekod untuk disalin.");
    let text = `*LAPORAN TRANSAKSI STOK*\nTarikh Janaan: ${new Date().toLocaleDateString('ms-MY')}\n\n`;
    filteredLogs.forEach(log => {
      const flow = log.flow_type === 'In' ? '+' : '-';
      text += `📅 Tarikh: ${formatDate(log.date)}\n🏢 Bisnes: ${log.biz_type}\n📦 Item: ${log.item_name} (${flow}${log.quantity})\n`;
      if (log.person_name) text += `👤 Pihak Terlibat: ${log.person_name}\n`;
      text += `--------------------------\n`;
    });
    navigator.clipboard.writeText(text).then(() => alert("Laporan transaksi berjaya disalin! Sila 'Paste' di WhatsApp."));
  };

  const copyBalanceReport = () => {
    if (balances.length === 0) return alert("Tiada rekod baki stok.");
    let text = `*LAPORAN BAKI STOK SEMASA*\nTarikh Semakan: ${new Date().toLocaleDateString('ms-MY')}\n\n`;
    const grouped = balances.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {});
    Object.keys(grouped).forEach(category => {
      text += `*=== ${category.toUpperCase()} ===*\n`;
      grouped[category].forEach(item => text += `- ${item.item_name}: Baki ${item.current_balance}\n`);
      text += `\n`;
    });
    navigator.clipboard.writeText(text).then(() => alert("Laporan rumusan baki stok berjaya disalin! Sila 'Paste' di WhatsApp."));
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-800">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <Header title="Inventory Dashboard" subtitle="Pengurusan stok masuk/keluar, dan baki produk syarikat." />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          
          <div className="flex space-x-2 bg-white p-1.5 rounded-xl shadow-sm border border-slate-200 w-full md:w-fit overflow-x-auto mb-6">
            <button onClick={() => setActiveTab('transaction')} className={`px-6 py-2.5 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${activeTab === 'transaction' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>Transaction Form</button>
            <button onClick={() => setActiveTab('history')} className={`px-6 py-2.5 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${activeTab === 'history' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>Rekod Harian Stok</button>
            <button onClick={() => setActiveTab('balance')} className={`px-6 py-2.5 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${activeTab === 'balance' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>Balance Stock</button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-20"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div></div>
          ) : (
            <>
              {activeTab === 'transaction' && (
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 max-w-4xl mx-auto animate-in fade-in zoom-in-95">
                  <h2 className="text-xl font-extrabold text-slate-900 mb-6 border-b border-slate-100 pb-4">Borang Transaksi Inventori</h2>
                  
                  <form onSubmit={handleTransactionSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">1. Jenis Aliran (Type)</label>
                        <div className="flex gap-4">
                          <label className={`flex-1 flex items-center justify-center py-3 border-2 rounded-xl cursor-pointer font-bold transition-all ${form.flow_type === 'In' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-400 bg-white hover:bg-slate-50'}`}>
                            <input type="radio" name="flow" className="hidden" checked={form.flow_type === 'In'} onChange={() => setForm({...form, flow_type: 'In'})} /> IN (MASUK)
                          </label>
                          <label className={`flex-1 flex items-center justify-center py-3 border-2 rounded-xl cursor-pointer font-bold transition-all ${form.flow_type === 'Out' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 text-slate-400 bg-white hover:bg-slate-50'}`}>
                            <input type="radio" name="flow" className="hidden" checked={form.flow_type === 'Out'} onChange={() => setForm({...form, flow_type: 'Out'})} /> OUT (KELUAR)
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tarikh Transaksi</label>
                        <input type="date" required value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium outline-none" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">2. Nama Item (Produk/Bahan)</label>
                        <input type="text" required list="item-list" placeholder="Pilih atau taip nama item..." value={form.item_name} onChange={(e) => setForm({...form, item_name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium outline-none" />
                        <datalist id="item-list">{balances.map(b => <option key={b.id} value={b.item_name} />)}</datalist>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Kategori Item</label>
                        <select value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium outline-none">
                          <option value="Produk Siap">Produk Siap</option><option value="Raw Material">Raw Material</option><option value="Packaging">Packaging</option><option value="Lain-lain">Lain-lain</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">3. Kuantiti (Unit)</label>
                        <input type="number" required min="1" placeholder="0" value={form.quantity} onChange={(e) => setForm({...form, quantity: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-black text-lg text-blue-700 outline-none" />
                      </div>
                      
                      {/* BAHAGIAN KATEGORI & NAMA (BARU DIKEMASKINI) */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">4. Pihak Terlibat</label>
                        <div className="flex gap-2">
                          <select value={form.person_category} onChange={(e) => setForm({...form, person_category: e.target.value})} className="w-2/5 px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-bold outline-none text-xs">
                            <option value="Customer">Customer</option>
                            <option value="Supplier">Supplier</option>
                            <option value="Staff">Staff</option>
                            <option value="Affiliate">Affiliate</option>
                          </select>
                          <input type="text" placeholder="Cth: Izzah / Kilang ABC" value={form.person_name} onChange={(e) => setForm({...form, person_name: e.target.value})} className="w-3/5 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium outline-none text-sm" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">5. Type Business</label>
                        <select value={form.biz_type} onChange={(e) => setForm({...form, biz_type: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium outline-none">
                          <option value="HQ">HQ</option><option value="Ecom">Ecom</option><option value="Tiktok">Tiktok</option><option value="Shopee">Shopee</option><option value="Dropship">Dropship</option><option value="Return">Return (Pemulangan)</option><option value="Marketing">Marketing / Tester</option><option value="Staff Purchase">Staff Purchase</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex justify-end">
                      <button type="submit" disabled={submitLoading} className="px-8 py-3.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/30 text-sm hover:-translate-y-0.5">
                        {submitLoading ? "Memproses..." : "Rekod Transaksi"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="animate-in fade-in zoom-in-95">
                  <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex flex-1 gap-4">
                      <div className="relative flex-1 max-w-sm"><input type="text" placeholder="Cari nama item atau pihak..." value={filters.search} onChange={(e) => setFilters({...filters, search: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" /><svg className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></div>
                      <select value={filters.biz_type} onChange={(e) => setFilters({...filters, biz_type: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"><option value="All">Semua Business Type</option><option value="HQ">HQ</option><option value="Ecom">Ecom</option><option value="Tiktok">Tiktok</option><option value="Shopee">Shopee</option><option value="Return">Return</option><option value="Marketing">Marketing</option></select>
                    </div>
                    <button onClick={copyHistoryReport} className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-emerald-500/20 flex items-center transition-all text-sm shrink-0">Copy WA Report</button>
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider">
                          <tr><th className="px-6 py-4 font-bold">Tarikh</th><th className="px-6 py-4 font-bold">Item & Kategori</th><th className="px-6 py-4 font-bold text-center">Type (In/Out)</th><th className="px-6 py-4 font-bold text-center">Unit</th><th className="px-6 py-4 font-bold">Pihak Terlibat / Business</th><th className="px-6 py-4 font-bold text-center">Tindakan</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {filteredLogs.length > 0 ? filteredLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-6 py-4 font-semibold text-slate-700">{formatDate(log.date)}</td>
                              <td className="px-6 py-4"><div className="font-extrabold text-slate-800">{log.item_name}</div><div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{log.category}</div></td>
                              <td className="px-6 py-4 text-center"><span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${log.flow_type === 'In' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{log.flow_type.toUpperCase()}</span></td>
                              <td className={`px-6 py-4 text-center font-black text-lg ${log.flow_type === 'In' ? 'text-emerald-600' : 'text-red-600'}`}>{log.flow_type === 'In' ? '+' : '-'}{log.quantity}</td>
                              <td className="px-6 py-4"><div className="font-bold text-slate-700">{log.person_name || "-"}</div><div className="text-xs text-blue-500 font-semibold">{log.biz_type}</div></td>
                              <td className="px-6 py-4 text-center"><button onClick={() => deleteLog(log.id, log.item_name, log.flow_type, log.quantity)} className="text-red-400 hover:bg-red-50 p-2 rounded-lg transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></td>
                            </tr>
                          )) : <tr><td colSpan="6" className="p-10 text-center text-slate-400 font-medium">Tiada rekod transaksi dijumpai.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'balance' && (
                <div className="animate-in fade-in zoom-in-95">
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center"><h3 className="font-extrabold text-slate-800">Rumusan Baki Semasa</h3><button onClick={copyBalanceReport} className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm">Copy WA Report</button></div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider">
                          <tr><th className="px-6 py-4 font-bold">Kategori</th><th className="px-6 py-4 font-bold">Nama Item</th><th className="px-6 py-4 font-bold text-center text-emerald-600">Total IN</th><th className="px-6 py-4 font-bold text-center text-red-600">Total OUT</th><th className="px-6 py-4 font-bold text-center text-indigo-600 bg-indigo-50/50">Current Balance</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {balances.length > 0 ? balances.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-6 py-4"><span className={`px-2.5 py-1 rounded text-[10px] font-bold ${item.category === 'Produk Siap' ? 'bg-blue-100 text-blue-700' : item.category === 'Raw Material' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-700'}`}>{item.category.toUpperCase()}</span></td>
                              <td className="px-6 py-4 font-extrabold text-slate-800 text-base">{item.item_name}</td>
                              <td className="px-6 py-4 text-center font-bold text-emerald-600">+{item.total_in}</td>
                              <td className="px-6 py-4 text-center font-bold text-red-600">-{item.total_out}</td>
                              <td className={`px-6 py-4 text-center font-black text-xl bg-indigo-50/20 ${item.current_balance <= 5 ? 'text-red-500' : 'text-indigo-600'}`}>{item.current_balance}{item.current_balance <= 5 && <div className="text-[9px] text-red-500 mt-1 uppercase tracking-widest">Kritikal</div>}</td>
                            </tr>
                          )) : <tr><td colSpan="5" className="p-10 text-center text-slate-400 font-medium">Tiada item dalam inventori.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}