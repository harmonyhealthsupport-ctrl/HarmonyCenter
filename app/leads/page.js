"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";

const COLUMNS = ["New Lead", "Follow Up", "KIV", "Closed Won"];

export default function LeadsManagementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  
  // Data States
  const [leads, setLeads] = useState([]);
  const [users, setUsers] = useState([]); 
  
  // State Modal Tambah Lead Manual
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: "", phone: "", source: "TikTok Ads", assigned_to: "", notes: ""
  });

  // Rujukan untuk Input File Tersembunyi (Upload CSV)
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, [router]);

  const fetchData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return router.push("/login");

    const [resLeads, resUsers] = await Promise.all([
      supabase.from("leads").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("full_name, display_name")
    ]);

    if (resLeads.data) setLeads(resLeads.data);
    if (resUsers.data) setUsers(resUsers.data);
    
    setLoading(false);
  };

  // ==========================================
  // FUNGSI DRAG AND DROP KANBAN
  // ==========================================
  const onDragStart = (e, leadId) => { e.dataTransfer.setData("leadId", leadId); };
  const onDragOver = (e) => { e.preventDefault(); };

  const onDrop = async (e, newStatus) => {
    const leadId = e.dataTransfer.getData("leadId");
    if (!leadId) return;

    setLeads(prev => prev.map(L => L.id.toString() === leadId ? { ...L, status: newStatus } : L));
    const { error } = await supabase.from("leads").update({ status: newStatus }).eq("id", leadId);
    if (error) { alert("Gagal menukar status: " + error.message); fetchData(); }
  };

  // ==========================================
  // FUNGSI TAMBAH PROSPEK MANUAL
  // ==========================================
  const handleAddLead = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);

    const { error } = await supabase.from("leads").insert([{
      name: form.name.trim(), phone: form.phone.trim(), source: form.source, assigned_to: form.assigned_to, notes: form.notes
    }]);

    if (!error) {
      alert("Prospek baru berjaya direkodkan!");
      setShowModal(false);
      setForm({ name: "", phone: "", source: "TikTok Ads", assigned_to: "", notes: "" });
      fetchData();
    } else { alert("Ralat merekod prospek: " + error.message); }
    
    setSubmitLoading(false);
  };

  // ==========================================
  // FUNGSI BULK UPLOAD CSV (BARU)
  // ==========================================
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSubmitLoading(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      const text = event.target.result;
      const rows = text.split("\n").filter(row => row.trim() !== "");
      const bulkData = [];

      // Loop bermula dari index 1 (Abaikan baris pertama / Header)
      for (let i = 1; i < rows.length; i++) {
        // Regex untuk baca CSV (mengabaikan koma di dalam "quotes")
        const cols = rows[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(col => col.replace(/^"|"$/g, '').trim());
        
        if (cols.length >= 2 && cols[0]) { // Mesti ada sekurang-kurangnya nama
          bulkData.push({
            name: cols[0] || "Unknown",
            phone: cols[1] || "-",
            source: cols[2] || "Manual",
            assigned_to: cols[3] || "",
            notes: cols[4] || "",
            status: "New Lead"
          });
        }
      }

      if (bulkData.length > 0) {
        const { error } = await supabase.from("leads").insert(bulkData);
        if (!error) {
          alert(`${bulkData.length} prospek berjaya dimuat naik dari fail!`);
          fetchData();
        } else {
          alert("Ralat memuat naik data: " + error.message);
        }
      } else {
        alert("Fail kosong atau format tidak tepat.");
      }
      setSubmitLoading(false);
      if(fileInputRef.current) fileInputRef.current.value = ""; // Reset input
    };

    reader.readAsText(file);
  };

  // FUNGSI PADAM REKOD
  const deleteLead = async (id) => {
    if(!confirm("Adakah anda pasti mahu memadam prospek ini?")) return;
    await supabase.from("leads").delete().eq("id", id);
    fetchData();
  };

  const getColumnColor = (status) => {
    if (status === 'New Lead') return 'border-blue-200 bg-blue-50/30';
    if (status === 'Follow Up') return 'border-amber-200 bg-amber-50/30';
    if (status === 'KIV') return 'border-slate-300 bg-slate-50';
    if (status === 'Closed Won') return 'border-emerald-200 bg-emerald-50/30';
    return 'border-slate-200 bg-white';
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-800">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        <Header title="Leads Management" subtitle="Urus prospek pelanggan dengan sistem Kanban (Tarik & Lepas)." />

        <main className="flex-1 overflow-x-auto overflow-y-hidden p-6 lg:p-8 flex flex-col">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 shrink-0 gap-4">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Paip Jualan (Sales Pipeline)</h3>
            
            <div className="flex items-center gap-3">
              {/* BUTANG UPLOAD CSV */}
              <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
              <button 
                onClick={() => fileInputRef.current.click()} 
                disabled={submitLoading}
                className="bg-white border-2 border-emerald-200 hover:bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-xl font-bold text-sm transition-transform hover:-translate-y-0.5 flex items-center shadow-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                {submitLoading ? "Memuat naik..." : "Upload CSV"}
              </button>

              <button onClick={() => setShowModal(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-emerald-500/20 text-sm transition-transform hover:-translate-y-0.5 flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                Tambah Prospek
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center flex-1"><div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full"></div></div>
          ) : (
            <div className="flex flex-1 gap-6 pb-4 items-start min-w-max">
              {COLUMNS.map(column => (
                <div 
                  key={column} 
                  onDragOver={onDragOver}
                  onDrop={(e) => onDrop(e, column)}
                  className={`w-80 flex flex-col max-h-full rounded-2xl border-2 p-4 transition-colors ${getColumnColor(column)}`}
                >
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-extrabold text-slate-800 uppercase tracking-wide text-sm">{column}</h4>
                    <span className="bg-white text-slate-600 border border-slate-200 px-2.5 py-0.5 rounded-lg text-xs font-black shadow-sm">
                      {leads.filter(L => L.status === column).length}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1 pb-2">
                    {leads.filter(L => L.status === column).map(lead => (
                      <div 
                        key={lead.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, lead.id)}
                        className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing hover:border-emerald-300 hover:shadow-md transition-all group relative"
                      >
                        <div className="flex justify-between items-start mb-1.5">
                          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">
                            {lead.source}
                          </span>
                          <button onClick={() => deleteLead(lead.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                        
                        <h5 className="font-extrabold text-slate-800 text-base leading-tight mb-1">{lead.name}</h5>
                        <p className="text-xs text-blue-600 font-bold mb-3">{lead.phone}</p>
                        
                        {lead.notes && <p className="text-[11px] text-slate-500 line-clamp-2 mb-3 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100 italic">"{lead.notes}"</p>}
                        
                        <div className="flex justify-between items-center mt-2 pt-3 border-t border-slate-100">
                          <div className="flex items-center text-[10px] font-bold text-slate-400 uppercase">
                            <span className="truncate max-w-[100px] text-emerald-600">{lead.assigned_to || "Unassigned"}</span>
                          </div>
                          <div className="text-[9px] font-bold text-slate-400">
                            {new Date(lead.created_at).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' })}
                          </div>
                        </div>
                      </div>
                    ))}
                    {leads.filter(L => L.status === column).length === 0 && (
                      <div className="p-4 border-2 border-dashed border-slate-300/50 rounded-xl text-center text-xs font-bold text-slate-400">
                        Lepaskan prospek di sini
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* MODAL TAMBAH LEAD MANUAL */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-extrabold text-lg text-slate-900 flex items-center">👤 Daftar Prospek (Lead) Baru</h3>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 focus:outline-none text-xl font-bold">&times;</button>
              </div>
              <form onSubmit={handleAddLead} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nama Prospek</label>
                    <input type="text" required placeholder="Cth: Ahmad Ali" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">No. Telefon</label>
                    <input type="text" required placeholder="Cth: 0123456789" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Punca (Source)</label>
                    <select value={form.source} onChange={e => setForm({...form, source: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500">
                      <option value="TikTok Ads">TikTok Ads</option><option value="Ecom Ads">Ecom Ads</option><option value="Manual / Walk-in">Manual / Walk-in</option><option value="Referral">Referral</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">PIC (Assigned To)</label>
                    <select value={form.assigned_to} onChange={e => setForm({...form, assigned_to: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500">
                      <option value="">-- Pilih Staf --</option>
                      {users.map((u, i) => <option key={i} value={u.display_name || u.full_name}>{u.display_name || u.full_name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Catatan (Notes)</label>
                  <textarea rows="3" placeholder="Nota awal tentang prospek ini..." value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-sm outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
                </div>
                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Batal</button>
                  <button type="submit" disabled={submitLoading} className="px-6 py-2.5 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-md shadow-emerald-500/30 transition-transform hover:-translate-y-0.5">
                    {submitLoading ? "Menyimpan..." : "Daftar Prospek"}
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