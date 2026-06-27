"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // STATE: Main Staff Modal
  const [showModal, setShowModal] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // STATE: KPI Modal
  const [showKpiModal, setShowKpiModal] = useState(false);
  const [selectedStaffKpi, setSelectedStaffKpi] = useState(null);
  const [kpiHistory, setKpiHistory] = useState([]);
  const [kpiLoading, setKpiLoading] = useState(false);

  // STATE: Dynamic Dropdowns (Roles & Departments)
  const [availableRoles, setAvailableRoles] = useState([]);
  const [availableDepartments, setAvailableDepartments] = useState([]);

  const [formData, setFormData] = useState({
    full_name: "",
    display_name: "",
    email: "",
    password: "", 
    role: "",
    department: "",
    modules: ["dashboard"],
  });

  const [kpiForm, setKpiForm] = useState({
    target_type: "Sales (RM Value)",
    target_value: "",
    product_focus: "-- General / Overall --",
    start_date: "",
    end_date: ""
  });

  // ==========================================
  // CROSS-DEVICE SYNC: FETCH DROPDOWN DATA
  // ==========================================
  const fetchDropdownOptions = async () => {
    // Fetch Roles from DB
    const { data: rolesData } = await supabase.from("roles_list").select("role_name").order("role_name");
    if (rolesData) {
      setAvailableRoles(rolesData.map(r => r.role_name));
      if (!formData.role && rolesData.length > 0) setFormData(prev => ({ ...prev, role: rolesData[0].role_name }));
    }

    // Fetch Departments from DB
    const { data: deptsData } = await supabase.from("departments_list").select("department_name").order("department_name");
    if (deptsData) {
      setAvailableDepartments(deptsData.map(d => d.department_name));
      if (!formData.department && deptsData.length > 0) setFormData(prev => ({ ...prev, department: deptsData[0].department_name }));
    }
  };

  const fetchStaff = async () => {
    const { data, error } = await supabase.from("user_roles").select("*").order("created_at", { ascending: true });
    if (!error && data) {
      setStaffList(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    const checkUserAndRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push("/login");

      // ROLE VERIFICATION: Admin Only
      const { data: profile } = await supabase
        .from("user_roles")
        .select("role")
        .eq("email", session.user.email)
        .maybeSingle();

      if (!profile || profile.role?.toLowerCase() !== "admin") {
        return router.push("/account"); // Redirect non-admins to their profile
      }

      setUser(session.user);
      fetchStaff();
      fetchDropdownOptions(); // Initial fetch
    };
    checkUserAndRole();
  }, [router]);

  // LIVE SYNC: Refetch options every time modal opens
  useEffect(() => {
    if (showModal) {
      fetchDropdownOptions();
    }
  }, [showModal]);

  // ==========================================
  // STAFF PROFILE MANAGEMENT
  // ==========================================
  const handleModuleToggle = (moduleName) => {
    setFormData((prev) => {
      const isSelected = prev.modules.includes(moduleName);
      const newModules = isSelected ? prev.modules.filter((m) => m !== moduleName) : [...prev.modules, moduleName];
      return { ...prev, modules: newModules };
    });
  };

  const handleEdit = (staff) => {
    setFormData({
      full_name: staff.full_name || "", display_name: staff.display_name || "", email: staff.email || "",
      password: "", // Clear password field on edit
      role: staff.role || availableRoles[0] || "User", 
      department: staff.department || availableDepartments[0] || "Sales",
      modules: staff.modules || ["dashboard"],
    });
    setEditingId(staff.id);
    setShowPassword(false);
    setShowModal(true);
  };

  const openNewModal = () => {
    setFormData({ 
      full_name: "", display_name: "", email: "", password: "", 
      role: availableRoles[0] || "User", 
      department: availableDepartments[0] || "Sales", 
      modules: ["dashboard"] 
    });
    setEditingId(null);
    setShowPassword(false);
    setShowModal(true);
  };

  const handleAddNewRole = async () => {
    const newRole = prompt("Enter a new Role name (e.g., Senior Team):");
    if (newRole && newRole.trim() !== "") {
      const formattedRole = newRole.trim();
      const { error } = await supabase.from("roles_list").insert([{ role_name: formattedRole }]);
      if (!error) {
        await fetchDropdownOptions();
        setFormData(prev => ({ ...prev, role: formattedRole }));
      } else {
        alert("Failed to add new role: " + error.message);
      }
    }
  };

  const handleAddNewDept = async () => {
    const newDept = prompt("Enter a new Department name (e.g., Finance):");
    if (newDept && newDept.trim() !== "") {
      const formattedDept = newDept.trim();
      const { error } = await supabase.from("departments_list").insert([{ department_name: formattedDept }]);
      if (!error) {
        await fetchDropdownOptions();
        setFormData(prev => ({ ...prev, department: formattedDept }));
      } else {
        alert("Failed to add new department: " + error.message);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    let error;

    // Separate password data so it doesn't enter user_roles
    const { password, ...updateData } = formData;

    if (editingId) {
      // EDIT: Update info only, not auth password
      const res = await supabase.from("user_roles").update(updateData).eq("id", editingId);
      error = res.error;
    } else {
      // NEW REGISTRATION: Create auth login & profile simultaneously
      if (!password) {
        alert("Password is required for new staff accounts.");
        setSubmitLoading(false);
        return;
      }
      const authRes = await supabase.auth.signUp({ email: formData.email, password });
      if (authRes.error) {
        alert("Authentication Error: " + authRes.error.message);
        setSubmitLoading(false);
        return;
      }
      const res = await supabase.from("user_roles").insert([updateData]);
      error = res.error;
    }

    if (!error) {
      setShowModal(false);
      fetchStaff();
    } else {
      alert("Error processing staff record: " + error.message);
    }
    setSubmitLoading(false);
  };

  const deleteStaff = async (id) => {
    if (confirm("Are you sure you want to delete this staff record?")) {
      await supabase.from("user_roles").delete().eq("id", id);
      fetchStaff();
    }
  };

  // ==========================================
  // KPI MANAGEMENT
  // ==========================================
  const fetchKpiHistory = async (email) => {
    const { data } = await supabase.from("user_kpi").select("*").eq("staff_email", email).order("created_at", { ascending: false });
    setKpiHistory(data || []);
  };

  const openKpiModal = (staff) => {
    setSelectedStaffKpi(staff);
    setKpiForm({ target_type: "Sales (RM Value)", target_value: "", product_focus: "-- General / Overall --", start_date: "", end_date: "" });
    fetchKpiHistory(staff.email);
    setShowKpiModal(true);
  };

  const submitKpi = async (e) => {
    e.preventDefault();
    setKpiLoading(true);
    
    const { error } = await supabase.from("user_kpi").insert([{
      staff_email: selectedStaffKpi.email,
      target_type: kpiForm.target_type,
      target_value: parseFloat(kpiForm.target_value),
      product_focus: kpiForm.product_focus,
      start_date: kpiForm.start_date || null,
      end_date: kpiForm.end_date || null
    }]);

    if (!error) {
      setKpiForm({ ...kpiForm, target_value: "", start_date: "", end_date: "" });
      fetchKpiHistory(selectedStaffKpi.email); 
    } else alert("Error saving KPI record.");
    
    setKpiLoading(false);
  };

  const deleteKpiRecord = async (id) => {
    if(confirm("Are you sure you want to delete this KPI record?")) {
      await supabase.from("user_kpi").delete().eq("id", id);
      fetchKpiHistory(selectedStaffKpi.email);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="flex h-screen bg-[#F4F7FE] font-sans text-slate-800">
      <Sidebar />

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <Header title="System & User Settings" subtitle="Manage profiles, passwords, and access levels (Admin Mode)." />

        <main className="flex-1 overflow-y-auto p-6 lg:px-10 pb-20">
          <div className="bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900">Staff Account List</h2>
              <button onClick={openNewModal} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md shadow-blue-500/20">
                + Register New Staff
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="px-6 py-4 font-semibold">Staff Profile</th>
                    <th className="px-6 py-4 font-semibold">Department</th>
                    <th className="px-6 py-4 font-semibold">Role</th>
                    <th className="px-6 py-4 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan="4" className="p-8 text-center text-slate-400">Loading staff list...</td></tr>
                  ) : staffList.length > 0 ? (
                    staffList.map((staff) => (
                      <tr key={staff.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold shadow-sm">
                              {staff.avatar_url ? (
                                <img src={staff.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                              ) : (
                                staff.display_name ? staff.display_name.charAt(0).toUpperCase() : staff.full_name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-slate-900">
                                {staff.full_name} {staff.display_name && <span className="text-slate-400 font-medium text-xs">({staff.display_name})</span>}
                              </div>
                              <div className="text-xs text-slate-500">{staff.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-700">{staff.department}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${staff.role?.toLowerCase() === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
                            {staff.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center space-x-2">
                            <button onClick={() => handleEdit(staff)} className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-lg transition-colors" title="Update Profile">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            <button onClick={() => openKpiModal(staff)} className="text-cyan-500 hover:text-cyan-700 hover:bg-cyan-50 p-2 rounded-lg transition-colors" title="KPI Settings">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth="2"/><circle cx="12" cy="12" r="6" strokeWidth="2"/><circle cx="12" cy="12" r="2" strokeWidth="2"/></svg>
                            </button>
                            <button onClick={() => deleteStaff(staff.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Delete Staff">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="4" className="p-8 text-center text-slate-400">No staff registered yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>

        {/* MODAL 1: REGISTER / EDIT STAFF */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-lg text-slate-900">{editingId ? "Update Staff Record" : "Register New Staff & Module Access"}</h3>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
              </div>
              <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div><label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label><input type="text" required value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm" /></div>
                    <div><label className="block text-sm font-semibold text-slate-700 mb-1">Display Name (Username)</label><input type="text" value={formData.display_name} onChange={(e) => setFormData({...formData, display_name: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm" placeholder="e.g., Hajar" /></div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
                      <input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} disabled={editingId} autoComplete="off" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50" />
                    </div>
                    
                    {!editingId && (
                      <div className="relative">
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
                        <div className="relative">
                          <input type={showPassword ? "text" : "password"} required={!editingId} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} placeholder="Set a password..." autoComplete="new-password" className="w-full pl-4 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                            {showPassword ? (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>) : (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>)}
                          </button>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Role</label>
                      <div className="flex gap-2">
                        <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm">
                          {availableRoles.length > 0 ? (
                            availableRoles.map(r => <option key={r} value={r}>{r}</option>)
                          ) : (
                            <option value="User">User</option>
                          )}
                        </select>
                        <button type="button" onClick={handleAddNewRole} className="px-3 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-700" title="Add New Role">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Department</label>
                      <div className="flex gap-2">
                        <select value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm">
                          {availableDepartments.length > 0 ? (
                            availableDepartments.map(d => <option key={d} value={d}>{d}</option>)
                          ) : (
                            <option value="Sales">Sales</option>
                          )}
                        </select>
                        <button type="button" onClick={handleAddNewDept} className="px-3 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-700" title="Add New Department">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-100">
                    <label className="block text-sm font-semibold text-blue-700 mb-3 flex items-center"><svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg> Sidebar Module Access</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      {[{ id: 'dashboard', label: 'Main Dashboard' }, { id: 'sales', label: 'CRM & Sales' }, { id: 'content-stats', label: 'Creator Stats' }, { id: 'leads', label: 'Leads Management' }, { id: 'inventory', label: 'Inventory System' }, { id: 'hr', label: 'HR & Payroll' }, { id: 'tasks', label: 'Task Manager' }, { id: 'account', label: 'My Account' }, { id: 'settings', label: 'System Admin' }].map((mod) => (
                        <label key={mod.id} className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 transition-all shadow-sm">
                          <input type="checkbox" checked={formData.modules.includes(mod.id)} onChange={() => handleModuleToggle(mod.id)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"/>
                          <span className="text-xs font-semibold text-slate-700">{mod.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                    <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors text-sm">Cancel</button>
                    <button type="submit" disabled={submitLoading} className="px-6 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20 text-sm">
                      {submitLoading ? "Processing..." : (editingId ? "Save Changes" : "Save Staff Account")}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: KPI SETTINGS */}
        {showKpiModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="px-6 py-4 bg-cyan-500 flex justify-between items-center text-white sticky top-0">
                <h3 className="font-bold text-lg flex items-center"><svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth="2"/><circle cx="12" cy="12" r="6" strokeWidth="2"/><circle cx="12" cy="12" r="2" strokeWidth="2"/></svg> KPI Target Settings</h3>
                <button onClick={() => setShowKpiModal(false)} className="text-cyan-100 hover:text-white text-2xl leading-none focus:outline-none">&times;</button>
              </div>
              <div className="p-6">
                <h4 className="text-sm font-bold text-cyan-600 mb-4 border-b border-slate-100 pb-2">Register New KPI</h4>
                <form onSubmit={submitKpi} className="space-y-4 mb-8">
                  <div><label className="block text-xs font-semibold text-slate-700 mb-1">Staff Email</label><input type="text" value={selectedStaffKpi?.email} readOnly className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-500 disabled:opacity-50" /></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-xs font-semibold text-slate-700 mb-1">Target Type</label><select value={kpiForm.target_type} onChange={(e) => setKpiForm({...kpiForm, target_type: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-cyan-200 rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm"><option value="Sales (RM Value)">Sales (RM Value)</option><option value="Sales (Product Units)">Sales (Product Units)</option><option value="Tasks Completed">Tasks Completed</option></select></div>
                    <div><label className="block text-xs font-semibold text-slate-700 mb-1">Target Value (Number)</label><input type="number" step="0.01" required placeholder="e.g., 50" value={kpiForm.target_value} onChange={(e) => setKpiForm({...kpiForm, target_value: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-cyan-200 rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm" /></div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Specific Product Focus (Or General)</label>
                    <select value={kpiForm.product_focus} onChange={(e) => setKpiForm({...kpiForm, product_focus: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm">
                      <option value="-- General / Overall --">-- General / Overall --</option>
                      <option value="Video Content">Video Content</option>
                      <option value="Live Content">Live Content</option>
                      <option value="Package (X)">Package (X)</option>
                      <option value="Agent (X)">Agent (X)</option>
                      <option value="Personal sales">Personal sales</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-xs font-semibold text-green-600 mb-1">Start Date</label><input type="date" value={kpiForm.start_date} onChange={(e) => setKpiForm({...kpiForm, start_date: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm" /></div>
                    <div><label className="block text-xs font-semibold text-red-600 mb-1">End Date</label><input type="date" value={kpiForm.end_date} onChange={(e) => setKpiForm({...kpiForm, end_date: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm" /></div>
                  </div>
                  <button type="submit" disabled={kpiLoading} className="w-full py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-lg transition-colors shadow-md shadow-cyan-500/30 text-sm mt-2">
                    {kpiLoading ? "Saving..." : "Register New Record"}
                  </button>
                </form>

                <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center border-b border-slate-100 pb-2"><svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> KPI Record History</h4>
                <div className="max-h-48 overflow-y-auto custom-scrollbar border border-slate-100 rounded-lg">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr><th className="p-3 font-bold text-xs">Type</th><th className="p-3 font-bold text-xs">Product</th><th className="p-3 font-bold text-xs">Target</th><th className="p-3 font-bold text-xs text-green-700">Start</th><th className="p-3 font-bold text-xs text-red-700">End</th><th className="p-3 font-bold text-xs text-center rounded-tr-lg">Delete</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {kpiHistory.length > 0 ? kpiHistory.map((kpi) => (
                        <tr key={kpi.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="p-3 text-xs text-slate-600">{kpi.target_type}</td>
                          <td className="p-3 text-xs text-slate-600">{kpi.product_focus}</td>
                          <td className="p-3 font-bold text-cyan-600">{kpi.target_value}</td>
                          <td className="p-3 text-xs">{formatDate(kpi.start_date)}</td>
                          <td className="p-3 text-xs">{formatDate(kpi.end_date)}</td>
                          <td className="p-3 text-center"><button onClick={() => deleteKpiRecord(kpi.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-50"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></td>
                        </tr>
                      )) : <tr><td colSpan="6" className="p-4 text-center text-slate-400 text-xs font-medium">No existing records.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
