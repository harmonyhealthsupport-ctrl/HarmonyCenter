"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";

export default function HRDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // State Pengguna Semasa
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("STAFF");
  
  // State Data HR
  const [attendances, setAttendances] = useState([]);
  const [requests, setRequests] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState(null);

  // State Paparan
  const [activeTab, setActiveTab] = useState("attendance"); // attendance, requests, payroll
  const [reqFormType, setReqFormType] = useState("Cuti"); // Cuti atau Claim
  const [submitLoading, setSubmitLoading] = useState(false);

  // State Borang Request (Cuti / Claim)
  const [reqForm, setReqForm] = useState({
    category: "Annual Leave (AL)",
    start_date: "",
    end_date: "",
    amount: "",
    description: ""
  });

  const todayStr = new Date().toLocaleDateString('en-CA'); // Format YYYY-MM-DD mengikut zon masa tempatan

  useEffect(() => {
    fetchHRData();
  }, [router]);

  const fetchHRData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return router.push("/login");

    const email = session.user.email;
    setUserEmail(email);

    // Dapatkan Role & Nama
    const { data: profile } = await supabase.from("user_roles").select("*").eq("email", email).maybeSingle();
    const role = profile?.role ? profile.role.toUpperCase() : "STAFF";
    const name = profile?.full_name || profile?.display_name || email.split('@')[0];
    setUserRole(role);
    setUserName(name);

    // Dapatkan data HR (Kalau ADMIN, nampak semua. Kalau STAFF, nampak sendiri sahaja)
    let attQuery = supabase.from("hr_attendance").select("*").order("date", { ascending: false });
    let reqQuery = supabase.from("hr_requests").select("*").order("created_at", { ascending: false });

    if (role !== "ADMIN") {
      attQuery = attQuery.eq("email", email);
      reqQuery = reqQuery.eq("email", email);
    }

    const [resAtt, resReq] = await Promise.all([attQuery, reqQuery]);

    if (resAtt.data) {
      setAttendances(resAtt.data);
      // Cek kalau user dah punch-in hari ini
      const todayRecord = resAtt.data.find(a => a.email === email && a.date === todayStr);
      setTodayAttendance(todayRecord || null);
    }
    if (resReq.data) setRequests(resReq.data);

    setLoading(false);
  };

  // ==========================================
  // FUNGSI PUNCH-IN / PUNCH-OUT
  // ==========================================
  const handlePunch = async (type) => {
    setSubmitLoading(true);
    const timeNow = new Date().toLocaleTimeString('en-GB', { hour12: false }); // 24hr format HH:mm:ss

    if (type === 'IN') {
      const { data, error } = await supabase.from("hr_attendance").insert([{
        email: userEmail,
        name: userName,
        date: todayStr,
        check_in: timeNow,
        status: "Hadir"
      }]).select().single();

      if (!error) setTodayAttendance(data);
      else alert("Ralat Punch-In: " + error.message);
    } 
    else if (type === 'OUT' && todayAttendance) {
      const { data, error } = await supabase.from("hr_attendance")
        .update({ check_out: timeNow })
        .eq("id", todayAttendance.id)
        .select().single();

      if (!error) setTodayAttendance(data);
      else alert("Ralat Punch-Out: " + error.message);
    }
    
    fetchHRData();
    setSubmitLoading(false);
  };

  // ==========================================
  // FUNGSI SUBMIT CUTI / CLAIM
  // ==========================================
  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);

    const { error } = await supabase.from("hr_requests").insert([{
      email: userEmail,
      name: userName,
      req_type: reqFormType,
      category: reqForm.category,
      start_date: reqForm.start_date || null,
      end_date: reqForm.end_date || null,
      amount: parseFloat(reqForm.amount) || 0,
      description: reqForm.description
    }]);

    if (!error) {
      alert("Permohonan berjaya dihantar kepada pihak pengurusan!");
      setReqForm({ category: reqFormType === 'Cuti' ? "Annual Leave (AL)" : "Mileage (Minyak/Tol)", start_date: "", end_date: "", amount: "", description: "" });
      fetchHRData();
    } else {
      alert("Ralat menghantar permohonan: " + error.message);
    }
    setSubmitLoading(false);
  };

  // ==========================================
  // FUNGSI APPROVE / REJECT OLEH ADMIN
  // ==========================================
  const updateRequestStatus = async (id, newStatus) => {
    if (!confirm(`Adakah anda pasti untuk ${newStatus.toUpperCase()} permohonan ini?`)) return;
    await supabase.from("hr_requests").update({ status: newStatus }).eq("id", id);
    fetchHRData();
  };

  // Format Masa & Tarikh
  const formatTime = (timeStr) => timeStr ? timeStr.substring(0, 5) : "--:--";
  const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : "-";

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div></div>;

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-800">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        <Header title="HR & Payroll" subtitle="Pengurusan kedatangan, cuti, tuntutan, dan slip gaji staf." />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          
          {/* TAB MENU */}
          <div className="flex space-x-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-100 w-full overflow-x-auto mb-6">
            <button onClick={() => setActiveTab('attendance')} className={`flex-1 px-6 py-3 rounded-xl font-black text-sm whitespace-nowrap transition-all ${activeTab === 'attendance' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
              🕒 Kedatangan (Punch Card)
            </button>
            <button onClick={() => setActiveTab('requests')} className={`flex-1 px-6 py-3 rounded-xl font-black text-sm whitespace-nowrap transition-all ${activeTab === 'requests' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
              📝 Cuti & Tuntutan (Claim)
            </button>
            <button onClick={() => setActiveTab('payroll')} className={`flex-1 px-6 py-3 rounded-xl font-black text-sm whitespace-nowrap transition-all ${activeTab === 'payroll' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
              💰 Slip Gaji (Payroll)
            </button>
          </div>

          <div className="animate-in fade-in zoom-in-95 duration-200">
            
            {/* ======================================================= */}
            {/* TAB 1: KEDATANGAN (ATTENDANCE) */}
            {/* ======================================================= */}
            {activeTab === 'attendance' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Panel Punch Card (Untuk Staf Sendiri) */}
                <div className="lg:col-span-1">
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h3 className="text-xl font-black text-slate-800 mb-1">{formatDate(todayStr)}</h3>
                    <p className="text-sm font-bold text-slate-500 mb-8">Rekod Kedatangan Harian</p>

                    {todayAttendance ? (
                      <div className="w-full space-y-4">
                        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex justify-between items-center">
                          <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">Punch In</span>
                          <span className="text-xl font-black text-emerald-600">{formatTime(todayAttendance.check_in)}</span>
                        </div>
                        {todayAttendance.check_out ? (
                          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Punch Out</span>
                            <span className="text-xl font-black text-slate-700">{formatTime(todayAttendance.check_out)}</span>
                          </div>
                        ) : (
                          <button onClick={() => handlePunch('OUT')} disabled={submitLoading} className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black text-lg shadow-lg shadow-red-500/30 transition-all hover:-translate-y-1">
                            {submitLoading ? "Memproses..." : "PUNCH OUT SEKARANG"}
                          </button>
                        )}
                        {todayAttendance.check_out && <p className="text-xs font-bold text-slate-400 mt-4">Terima kasih! Rekod hari ini telah lengkap.</p>}
                      </div>
                    ) : (
                      <button onClick={() => handlePunch('IN')} disabled={submitLoading} className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-lg shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-1">
                        {submitLoading ? "Memproses..." : "PUNCH IN SEKARANG"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Sejarah Kedatangan (History) */}
                <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col h-full">
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-6 flex justify-between items-center">
                    Sejarah Kedatangan {userRole === 'ADMIN' && <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black">Paparan Admin</span>}
                  </h3>
                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest border-b border-slate-100">
                        <tr><th className="px-4 py-3 font-bold">Tarikh</th>{userRole === 'ADMIN' && <th className="px-4 py-3 font-bold">Nama Staf</th>}<th className="px-4 py-3 font-bold text-center">Punch In</th><th className="px-4 py-3 font-bold text-center">Punch Out</th><th className="px-4 py-3 font-bold text-center">Status</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {attendances.length > 0 ? attendances.map((att) => (
                          <tr key={att.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-4 font-bold text-slate-700">{formatDate(att.date)}</td>
                            {userRole === 'ADMIN' && <td className="px-4 py-4 font-black text-slate-800 capitalize">{att.name}</td>}
                            <td className="px-4 py-4 text-center font-bold text-emerald-600">{formatTime(att.check_in)}</td>
                            <td className="px-4 py-4 text-center font-bold text-slate-500">{formatTime(att.check_out)}</td>
                            <td className="px-4 py-4 text-center"><span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase">{att.status}</span></td>
                          </tr>
                        )) : <tr><td colSpan={userRole === 'ADMIN' ? 5 : 4} className="p-8 text-center text-slate-400 font-medium">Tiada rekod kedatangan.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================= */}
            {/* TAB 2: CUTI & TUNTUTAN (REQUESTS) */}
            {/* ======================================================= */}
            {activeTab === 'requests' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Borang Permohonan (E-Leave / E-Claim) */}
                <div className="lg:col-span-1 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-fit">
                  <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                    <button type="button" onClick={() => {setReqFormType('Cuti'); setReqForm({...reqForm, category: 'Annual Leave (AL)'})}} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${reqFormType === 'Cuti' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'}`}>Mohon Cuti</button>
                    <button type="button" onClick={() => {setReqFormType('Claim'); setReqForm({...reqForm, category: 'Mileage (Minyak/Tol)'})}} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${reqFormType === 'Claim' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'}`}>Tuntutan (Claim)</button>
                  </div>

                  <form onSubmit={handleSubmitRequest} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Kategori {reqFormType}</label>
                      <select value={reqForm.category} onChange={e => setReqForm({...reqForm, category: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-sm font-bold text-slate-700 outline-none">
                        {reqFormType === 'Cuti' ? (
                          <><option value="Annual Leave (AL)">Annual Leave (AL)</option><option value="Medical Leave (MC)">Medical Leave (MC)</option><option value="Emergency Leave (EL)">Emergency Leave (EL)</option><option value="Unpaid Leave">Unpaid Leave</option></>
                        ) : (
                          <><option value="Mileage (Minyak/Tol)">Mileage (Minyak/Tol)</option><option value="Medical (Klinik)">Medical (Klinik)</option><option value="Allowance/Misc">Elaun / Lain-lain</option></>
                        )}
                      </select>
                    </div>

                    {reqFormType === 'Cuti' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Mula Cuti</label><input type="date" required value={reqForm.start_date} onChange={e => setReqForm({...reqForm, start_date: e.target.value})} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none" /></div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tamat Cuti</label><input type="date" required value={reqForm.end_date} onChange={e => setReqForm({...reqForm, end_date: e.target.value})} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none" /></div>
                      </div>
                    )}

                    {reqFormType === 'Claim' && (
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Jumlah Tuntutan (RM)</label>
                        <input type="number" step="0.01" required placeholder="0.00" value={reqForm.amount} onChange={e => setReqForm({...reqForm, amount: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-sm font-black text-amber-600 outline-none" />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Sebab / Tujuan</label>
                      <textarea rows="3" required placeholder="Nyatakan sebab permohonan..." value={reqForm.description} onChange={e => setReqForm({...reqForm, description: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-sm outline-none resize-none" />
                    </div>

                    <button type="submit" disabled={submitLoading} className="w-full py-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-sm shadow-md transition-transform hover:-translate-y-0.5">
                      {submitLoading ? "Menghantar..." : "Hantar Permohonan"}
                    </button>
                  </form>
                </div>

                {/* Senarai Permohonan (History & Admin Approval) */}
                <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col h-full">
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-6 flex justify-between items-center">
                    Status Permohonan {userRole === 'ADMIN' && <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black">Panel Kelulusan Admin</span>}
                  </h3>
                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest border-b border-slate-100">
                        <tr><th className="px-4 py-3 font-bold">Tarikh Mohon</th><th className="px-4 py-3 font-bold">Jenis & Kategori</th><th className="px-4 py-3 font-bold">Butiran</th><th className="px-4 py-3 font-bold text-center">Status</th>{userRole === 'ADMIN' && <th className="px-4 py-3 font-bold text-center">Tindakan</th>}</tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {requests.length > 0 ? requests.map((req) => (
                          <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-4 font-bold text-slate-600">{formatDate(req.created_at)}</td>
                            <td className="px-4 py-4">
                              <div className="font-black text-slate-800 uppercase">{req.req_type}</div>
                              <div className="text-[10px] font-bold text-amber-600">{req.category}</div>
                              {userRole === 'ADMIN' && <div className="text-[10px] font-bold text-slate-400 mt-1 capitalize">Oleh: {req.name}</div>}
                            </td>
                            <td className="px-4 py-4">
                              {req.req_type === 'Cuti' ? (
                                <div className="text-xs font-semibold text-slate-600">{formatDate(req.start_date)} - {formatDate(req.end_date)}</div>
                              ) : (
                                <div className="font-black text-slate-800">RM {Number(req.amount).toLocaleString('en-MY', {minimumFractionDigits: 2})}</div>
                              )}
                              <div className="text-[10px] text-slate-500 max-w-[150px] truncate mt-0.5" title={req.description}>{req.description}</div>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${req.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : req.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                {req.status}
                              </span>
                            </td>
                            {userRole === 'ADMIN' && (
                              <td className="px-4 py-4 text-center">
                                {req.status === 'Pending' ? (
                                  <div className="flex justify-center gap-2">
                                    <button onClick={() => updateRequestStatus(req.id, 'Approved')} className="bg-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-black transition-colors">LULUS</button>
                                    <button onClick={() => updateRequestStatus(req.id, 'Rejected')} className="bg-red-100 text-red-700 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-black transition-colors">TOLAK</button>
                                  </div>
                                ) : <span className="text-[10px] font-bold text-slate-300">- Selesai -</span>}
                              </td>
                            )}
                          </tr>
                        )) : <tr><td colSpan={userRole === 'ADMIN' ? 5 : 4} className="p-8 text-center text-slate-400 font-medium">Tiada rekod permohonan.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================= */}
            {/* TAB 3: PAYROLL (SLIP GAJI) */}
            {/* ======================================================= */}
            {activeTab === 'payroll' && (
              <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
                {/* Corak Latar */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl -mr-20 -mt-20 z-0"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-b border-slate-100 pb-6">
                  <div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tighter mb-1">Penyata Gaji</h2>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Sistem Auto-Jana Harmony</p>
                  </div>
                  <div className="mt-4 md:mt-0 text-right">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Bulan Semasa</p>
                    <div className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl font-black text-lg">
                      {new Date().toLocaleDateString('ms-MY', { month: 'long', year: 'numeric' }).toUpperCase()}
                    </div>
                  </div>
                </div>

                <div className="relative z-10 grid grid-cols-2 gap-6 mb-8">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Nama Pekerja</p>
                    <p className="text-base font-black text-slate-800 capitalize">{userName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Jawatan / Role</p>
                    <p className="text-base font-black text-emerald-600">{userRole}</p>
                  </div>
                </div>

                <div className="relative z-10 bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-8">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-bold text-slate-600">Gaji Asas (Basic)</span>
                    <span className="text-sm font-black text-slate-800">RM 1,500.00</span>
                  </div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-bold text-slate-600">Elaun & Tuntutan (Claim) Diluluskan</span>
                    <span className="text-sm font-black text-emerald-600">
                      + RM {requests.filter(r => r.req_type === 'Claim' && r.status === 'Approved').reduce((sum, r) => sum + Number(r.amount), 0).toLocaleString('en-MY', {minimumFractionDigits: 2})}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-4 pt-4 border-t border-slate-200">
                    <span className="text-sm font-bold text-slate-600">Potongan KWSP (11%)</span>
                    <span className="text-sm font-black text-red-500">- RM 165.00</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-slate-600">Potongan SOCSO (0.5%)</span>
                    <span className="text-sm font-black text-red-500">- RM 7.50</span>
                  </div>
                </div>

                <div className="relative z-10 bg-slate-800 rounded-2xl p-6 flex justify-between items-center shadow-lg">
                  <span className="text-sm font-bold text-slate-300 uppercase tracking-widest">Gaji Bersih (Net Pay)</span>
                  <span className="text-3xl font-black text-white">
                    RM {(
                      1500 
                      + requests.filter(r => r.req_type === 'Claim' && r.status === 'Approved').reduce((sum, r) => sum + Number(r.amount), 0) 
                      - 165 - 7.50
                    ).toLocaleString('en-MY', {minimumFractionDigits: 2})}
                  </span>
                </div>

                <div className="relative z-10 mt-8 text-center flex flex-col items-center">
                  <button className="bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-600 px-6 py-3 rounded-xl font-bold text-sm flex items-center transition-colors shadow-sm">
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                    Cetak / Muat Turun PDF
                  </button>
                  <p className="text-[9px] text-slate-400 font-bold mt-4">Dokumen ini dijana secara automatik oleh sistem. Tiada tandatangan diperlukan.</p>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}