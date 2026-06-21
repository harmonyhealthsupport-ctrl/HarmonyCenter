"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";

export default function CustomerDatabasePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  
  // State untuk Filter & Carian
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("All");

  useEffect(() => {
    fetchCustomers();
  }, [router]);

  const fetchCustomers = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return router.push("/login");

    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("last_purchase_date", { ascending: false });

    if (data) setCustomers(data);
    setLoading(false);
  };

  // Fungsi Tapis Data
  const filteredCustomers = customers.filter(c => {
    const matchSearch = (c.name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) || 
                        (c.phone || "").includes(searchQuery);
    const matchLevel = levelFilter === "All" || c.customer_level === levelFilter;
    return matchSearch && matchLevel;
  });

  // FUNGSI COPY UNTUK BLASTING (Salin Nombor Telefon)
  const copyForBlasting = () => {
    if (filteredCustomers.length === 0) {
      return alert("Tiada data pelanggan untuk disalin.");
    }
    
    // Ekstrak nombor telefon dan gabungkan dengan koma/baris baru
    const phoneList = filteredCustomers.map(c => c.phone).join("\n");
    
    navigator.clipboard.writeText(phoneList).then(() => {
      alert(`Berjaya menyalin ${filteredCustomers.length} nombor telefon untuk tujuan blasting!`);
    }).catch(err => {
      alert("Gagal menyalin: ", err);
    });
  };

  // Metrik Ringkas
  const totalNew = customers.filter(c => c.customer_level === 'New').length;
  const totalRepeat = customers.filter(c => c.customer_level === 'Repeat').length;
  const totalMember = customers.filter(c => c.customer_level === 'Member').length;
  const totalVIP = customers.filter(c => c.customer_level === 'VIP').length;

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-800">
      <Sidebar />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header title="Customer Database" subtitle="Pengurusan profil pelanggan dan perahan data untuk tujuan marketing." />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          
          {/* KAD METRIK PROFILING */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 border-l-4 border-l-blue-400">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">New (1x Beli)</p>
              <h3 className="text-2xl font-black text-blue-600">{totalNew}</h3>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 border-l-4 border-l-amber-400">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Repeat (2-3x Beli)</p>
              <h3 className="text-2xl font-black text-amber-500">{totalRepeat}</h3>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 border-l-4 border-l-purple-400">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Member (4-6x Beli)</p>
              <h3 className="text-2xl font-black text-purple-600">{totalMember}</h3>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 border-l-4 border-l-red-400">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">VIP (&gt;6x Beli)</p>
              <h3 className="text-2xl font-black text-red-600">{totalVIP}</h3>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <div className="flex flex-1 w-full gap-4">
              <div className="relative flex-1 max-w-sm">
                <input 
                  type="text" 
                  placeholder="Cari nama atau nombor..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                />
                <svg className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <select 
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm font-bold text-slate-600"
              >
                <option value="All">Semua Level</option>
                <option value="New">New</option>
                <option value="Repeat">Repeat</option>
                <option value="Member">Member</option>
                <option value="VIP">VIP</option>
              </select>
            </div>

            <button 
              onClick={copyForBlasting} 
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-emerald-500/20 flex items-center transition-all text-sm w-full sm:w-auto justify-center hover:-translate-y-0.5"
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Ekstrak DB (Blasting)
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-bold">Profil Pelanggan</th>
                    <th className="px-6 py-4 font-bold text-center">Tahap Kesetiaan</th>
                    <th className="px-6 py-4 font-bold text-center">Jumlah Pembelian</th>
                    <th className="px-6 py-4 font-bold text-right">Total Perbelanjaan (RM)</th>
                    <th className="px-6 py-4 font-bold text-center">Pembelian Terakhir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan="5" className="p-8 text-center text-slate-400">Memuatkan data pelanggan...</td></tr>
                  ) : filteredCustomers.length > 0 ? (
                    filteredCustomers.map((cust) => (
                      <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-black text-slate-800 uppercase tracking-wide">{cust.name}</div>
                          <div className="text-xs text-slate-500 font-bold mt-0.5">{cust.phone}</div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wider ${
                            cust.customer_level === 'VIP' ? 'bg-red-100 text-red-700' :
                            cust.customer_level === 'Member' ? 'bg-purple-100 text-purple-700' :
                            cust.customer_level === 'Repeat' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {cust.customer_level}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-slate-600">
                          {cust.total_purchases} Kali
                        </td>
                        <td className="px-6 py-4 text-right font-black text-emerald-600 text-base">
                          RM {Number(cust.total_spent || 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-center text-xs font-semibold text-slate-500">
                          {cust.last_purchase_date ? new Date(cust.last_purchase_date).toLocaleDateString('ms-MY') : "-"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="5" className="p-10 text-center text-slate-400 font-medium">Tiada rekod pelanggan dijumpai.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}