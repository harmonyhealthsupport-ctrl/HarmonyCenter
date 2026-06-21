"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";

const COLUMNS = ["To Do", "In Progress", "Review", "Done"];

export default function TaskManagerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  
  // State Modal Tambah Task
  const [showModal, setShowModal] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", priority: "Medium", assigned_to: "", due_date: ""
  });

  useEffect(() => {
    fetchData();
  }, [router]);

  const fetchData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return router.push("/login");

    const [resTasks, resUsers] = await Promise.all([
      supabase.from("tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("full_name, display_name")
    ]);

    if (resTasks.data) setTasks(resTasks.data);
    if (resUsers.data) setUsers(resUsers.data);
    
    setLoading(false);
  };

  // ==========================================
  // FUNGSI DRAG AND DROP KANBAN
  // ==========================================
  const onDragStart = (e, taskId) => {
    e.dataTransfer.setData("taskId", taskId);
  };

  const onDragOver = (e) => {
    e.preventDefault(); // Mesti ada untuk benarkan 'Drop'
  };

  const onDrop = async (e, newStatus) => {
    const taskId = e.dataTransfer.getData("taskId");
    if (!taskId) return;

    // Update state di frontend (UI) terus supaya nampak pantas
    setTasks(prev => prev.map(t => t.id.toString() === taskId ? { ...t, status: newStatus } : t));

    // Update di pangkalan data (Backend)
    const { error } = await supabase.from("tasks").update({ status: newStatus }).eq("id", taskId);
    if (error) {
      alert("Gagal menukar status: " + error.message);
      fetchData(); // Reset kalau gagal
    }
  };

  // ==========================================
  // FUNGSI TAMBAH & PADAM TASK
  // ==========================================
  const handleAddTask = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);

    const { error } = await supabase.from("tasks").insert([{
      title: form.title,
      description: form.description,
      priority: form.priority,
      assigned_to: form.assigned_to,
      due_date: form.due_date || null
    }]);

    if (!error) {
      setShowModal(false);
      setForm({ title: "", description: "", priority: "Medium", assigned_to: "", due_date: "" });
      fetchData();
    } else {
      alert("Ralat menambah task: " + error.message);
    }
    setSubmitLoading(false);
  };

  const deleteTask = async (id) => {
    if(!confirm("Padam tugasan ini?")) return;
    await supabase.from("tasks").delete().eq("id", id);
    fetchData();
  };

  const getPriorityColor = (priority) => {
    if (priority === 'High') return 'bg-red-100 text-red-700 border-red-200';
    if (priority === 'Medium') return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-800">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        <Header title="Task Manager" subtitle="Papan Kanban untuk pengurusan tugasan pasukan." />

        <main className="flex-1 overflow-x-auto overflow-y-hidden p-6 lg:p-8 flex flex-col">
          
          <div className="flex justify-between items-center mb-6 shrink-0">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Kanban Board</h3>
            <button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-blue-500/20 text-sm transition-all hover:-translate-y-0.5">
              + Tugasan Baru
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center flex-1"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div></div>
          ) : (
            <div className="flex flex-1 gap-6 pb-4 items-start min-w-max">
              {COLUMNS.map(column => (
                <div 
                  key={column} 
                  onDragOver={onDragOver}
                  onDrop={(e) => onDrop(e, column)}
                  className="w-80 flex flex-col max-h-full bg-slate-100/50 rounded-2xl border border-slate-200/60 p-4"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-extrabold text-slate-700 uppercase tracking-wide text-sm">{column}</h4>
                    <span className="bg-slate-200 text-slate-500 px-2 py-0.5 rounded-lg text-xs font-bold">
                      {tasks.filter(t => t.status === column).length}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                    {tasks.filter(t => t.status === column).map(task => (
                      <div 
                        key={task.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, task.id)}
                        className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing hover:border-blue-300 transition-colors group relative"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                          <button onClick={() => deleteTask(task.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                        
                        <h5 className="font-bold text-slate-800 text-sm mb-1">{task.title}</h5>
                        {task.description && <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">{task.description}</p>}
                        
                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100">
                          <div className="flex items-center text-[10px] font-bold text-slate-400 uppercase">
                            <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            <span className="truncate max-w-[80px]">{task.assigned_to || "Unassigned"}</span>
                          </div>
                          {task.due_date && (
                            <div className={`text-[10px] font-bold flex items-center ${new Date(task.due_date) < new Date() && task.status !== 'Done' ? 'text-red-500' : 'text-slate-400'}`}>
                              <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              {new Date(task.due_date).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' })}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {tasks.filter(t => t.status === column).length === 0 && (
                      <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl text-center text-xs font-bold text-slate-400">
                        Lepaskan tugasan di sini
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* MODAL TAMBAH TASK */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-extrabold text-lg text-slate-900 flex items-center">📝 Cipta Tugasan Baru</h3>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 focus:outline-none text-xl font-bold">&times;</button>
              </div>
              <form onSubmit={handleAddTask} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tajuk Tugasan</label>
                  <input type="text" required placeholder="Apa yang perlu disiapkan?" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Penerangan / Detail (Opsional)</label>
                  <textarea rows="3" placeholder="Butiran lanjut..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Prioriti</label>
                    <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Due Date (Tarikh Akhir)</label>
                    <input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tugaskan Kepada (Assign To)</label>
                  <select value={form.assigned_to} onChange={e => setForm({...form, assigned_to: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">-- Pilih Staf --</option>
                    {users.map((u, i) => <option key={i} value={u.display_name || u.full_name}>{u.display_name || u.full_name}</option>)}
                  </select>
                </div>
                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                  <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200">Batal</button>
                  <button type="submit" disabled={submitLoading} className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-md shadow-blue-500/30">{submitLoading ? "Menyimpan..." : "Cipta Tugasan"}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}