"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";

export default function SalesDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // RBAC States
  const [isAdmin, setIsAdmin] = useState(false);
  const [userDept, setUserDept] = useState("");

  // Raw Data
  const [salesData, setSalesData] = useState([]);
  const [customersData, setCustomersData] = useState([]);
  
  // Filter States (Default: Current Month)
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]);
  const [department, setDepartment] = useState("All");
  const [staff, setStaff] = useState("All");
  const [source, setSource] = useState("All");
  const [productFilter, setProductFilter] = useState("All");

  useEffect(() => {
    fetchDashboardData();
  }, [startDate, endDate, router]);

  const fetchDashboardData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return router.push("/login");

    // 1. Fetch User Profile for RBAC
    const { data: profile } = await supabase
      .from("user_roles")
      .select("role, department")
      .eq("email", session.user.email)
      .maybeSingle();

    const userIsAdmin = profile?.role?.toLowerCase() === 'admin';
    const userDepartment = profile?.department || '';
    
    setIsAdmin(userIsAdmin);
    setUserDept(userDepartment);

    // Lock the department filter automatically if not an admin
    if (!userIsAdmin && userDepartment) {
      setDepartment(userDepartment);
    }

    // 2. Fetch Sales and Customers Data
    const [resSales, resCustomers] = await Promise.all([
      supabase.from("sales").select("*").gte("sale_date", startDate).lte("sale_date", endDate),
      supabase.from("customers").select("customer_level")
    ]);

    // 3. Apply RBAC Filtering on Sales Data
    let fetchedSales = resSales.data || [];
    if (!userIsAdmin && userDepartment) {
      fetchedSales = fetchedSales.filter(sale => sale.department === userDepartment);
    }

    setSalesData(fetchedSales);
    if (resCustomers.data) setCustomersData(resCustomers.data);
    
    setLoading(false);
  };

  // ==========================================
  // CALCULATIONS & DATA FILTERING
  // ==========================================
  const filteredSales = salesData.filter(sale => {
    const matchDept = department === "All" || sale.department === department;
    const matchStaff = staff === "All" || sale.sales_person === staff;
    const matchSource = source === "All" || sale.sales_source === source;
    const matchProduct = productFilter === "All" || sale.product_name === productFilter;
    return matchDept && matchStaff && matchSource && matchProduct;
  });

  // Main KPIs
  const totalSalesRM = filteredSales.reduce((sum, item) => sum + Number(item.total_amount || 0), 0);
  const totalOrders = filteredSales.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const avgOrderValue = filteredSales.length > 0 ? (totalSalesRM / filteredSales.length) : 0;

  // Top Performing Staff
  const staffStats = filteredSales.reduce((acc, sale) => {
    const name = sale.sales_person?.split('@')[0] || sale.customer_name || 'UNKNOWN'; // Fallback if no sales_person
    acc[name] = (acc[name] || 0) + Number(sale.total_amount || 0);
    return acc;
  }, {});
  const topStaffs = Object.entries(staffStats).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxStaffSales = topStaffs.length > 0 ? topStaffs[0][1] : 1;

  // Sales By Product
  const productStats = filteredSales.reduce((acc, sale) => {
    const prod = sale.product_name || 'Others';
    acc[prod] = (acc[prod] || 0) + Number(sale.total_amount || 0);
    return acc;
  }, {});
  const topProducts = Object.entries(productStats).sort((a, b) => b[1] - a[1]);
  const maxProductSales = topProducts.length > 0 ? topProducts[0][1] : 1;

  // Sales By Source (Platform)
  const sourceStats = filteredSales.reduce((acc, sale) => {
    const src = sale.sales_source || 'Manual';
    acc[src] = (acc[src] || 0) + Number(sale.total_amount || 0);
    return acc;
  }, {});
  const topSources = Object.entries(sourceStats).sort((a, b) => b[1] - a[1]);

  // Customer Profiling (Entire DB)
  const profileStats = customersData.reduce((acc, cust) => {
    const level = cust.customer_level || 'New';
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, { New: 0, Repeat: 0, Member: 0, VIP: 0 });
  const totalCustomers = customersData.length || 1;

  // Extract unique lists for Dropdown Filters based on RBAC filtered data
  const uniqueDepts = [...new Set(salesData.map(s => s.department).filter(Boolean))];
  const uniqueStaffs = [...new Set(salesData.map(s => s.sales_person).filter(Boolean))];
  const uniqueSources = [...new Set(salesData.map(s => s.sales_source).filter(Boolean))];
  const uniqueProducts = [...new Set(salesData.map(s => s.product_name).filter(Boolean))];

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div></div>;

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-800">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        <Header title="Sales Dashboard" subtitle="Real-time business analysis and performance." />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
          
          {/* ========================================== */}
          {/* 1. ADVANCED FILTER BAR */}
          {/* ========================================== */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">From Date</label>
              <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">To Date</label>
              <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Department</label>
              <select 
                value={department} 
                onChange={e=>setDepartment(e.target.value)} 
                disabled={!isAdmin}
                className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 ${!isAdmin ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isAdmin ? (
                  <>
                    <option value="All">All Departments</option>
                    {uniqueDepts.map((d, i) => <option key={i} value={d}>{d}</option>)}
                  </>
                ) : (
                  <option value={userDept}>{userDept}</option>
                )}
              </select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Assigned Staff</label>
              <select value={staff} onChange={e=>setStaff(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500">
                <option value="All">All Staff</option>
                {uniqueStaffs.map((s, i) => <option key={i} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Source (Platform)</label>
              <select value={source} onChange={e=>setSource(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500">
                <option value="All">All Sources</option>
                {uniqueSources.map((s, i) => <option key={i} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Product</label>
              <select value={productFilter} onChange={e=>setProductFilter(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500">
                <option value="All">All Products</option>
                {uniqueProducts.map((p, i) => <option key={i} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* ========================================== */}
          {/* 2. MAIN KPIs */}
          {/* ========================================== */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-1">Total Sales</p>
                <h3 className="text-3xl font-black text-slate-800">RM {totalSalesRM.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</h3>
              </div>
              <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center z-10">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-1">Total Orders</p>
                <h3 className="text-3xl font-black text-slate-800">{totalOrders} <span className="text-sm text-slate-400 font-bold">Units</span></h3>
              </div>
              <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center z-10">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-1">Avg Order Value</p>
                <h3 className="text-3xl font-black text-slate-800">RM {avgOrderValue.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</h3>
              </div>
              <div className="w-12 h-12 bg-purple-50 text-purple-500 rounded-full flex items-center justify-center z-10">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              </div>
            </div>
          </div>

          {/* ========================================== */}
          {/* 3. TOP PERFORMER & CUSTOMER PROFILING */}
          {/* ========================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* TOP PERFORMING STAFF */}
            <div className="bg-white p-7 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-6">Top Performing Staff</h3>
              <div className="space-y-5">
                {topStaffs.length > 0 ? topStaffs.map((staff, idx) => {
                  const percent = (staff[1] / maxStaffSales) * 100;
                  return (
                    <div key={idx}>
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mr-3 ${idx === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{idx + 1}</span>
                          <span className="text-sm font-bold text-slate-700 uppercase">{staff[0]}</span>
                        </div>
                        <span className="text-sm font-black text-slate-900">RM {staff[1].toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div className={`h-full rounded-full ${idx === 0 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${percent}%` }}></div>
                      </div>
                    </div>
                  );
                }) : <div className="text-center py-4 text-slate-400 text-sm">No staff data available.</div>}
              </div>
            </div>

            {/* CUSTOMER PROFILING */}
            <div className="bg-white p-7 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-6 flex items-center">
                Customer Base Analytics
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">New</div>
                  <div className="text-2xl font-black text-slate-700">{profileStats.New}</div>
                  <div className="text-[10px] font-bold text-blue-500 mt-1">{((profileStats.New/totalCustomers)*100).toFixed(1)}% of DB</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Repeat</div>
                  <div className="text-2xl font-black text-slate-700">{profileStats.Repeat}</div>
                  <div className="text-[10px] font-bold text-amber-500 mt-1">{((profileStats.Repeat/totalCustomers)*100).toFixed(1)}% of DB</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Member</div>
                  <div className="text-2xl font-black text-slate-700">{profileStats.Member}</div>
                  <div className="text-[10px] font-bold text-purple-500 mt-1">{((profileStats.Member/totalCustomers)*100).toFixed(1)}% of DB</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">VIP</div>
                  <div className="text-2xl font-black text-slate-700">{profileStats.VIP}</div>
                  <div className="text-[10px] font-bold text-red-500 mt-1">{((profileStats.VIP/totalCustomers)*100).toFixed(1)}% of DB</div>
                </div>
              </div>
            </div>

          </div>

          {/* ========================================== */}
          {/* 4. SALES BY PLATFORM/SOURCE & PRODUCT */}
          {/* ========================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* SALES BY SOURCE / PLATFORM */}
            <div className="bg-white p-7 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-6">Sales By Platform / Source</h3>
              <div className="space-y-5">
                {topSources.length > 0 ? topSources.map(([src, val], idx) => {
                  const percent = (val / totalSalesRM) * 100;
                  // Color bar based on source
                  let colorClass = "bg-blue-500";
                  if (src.toLowerCase().includes('tiktok')) colorClass = "bg-slate-800";
                  if (src.toLowerCase().includes('shopee') || src.toLowerCase().includes('ecom')) colorClass = "bg-orange-500";
                  if (src.toLowerCase().includes('blasting')) colorClass = "bg-emerald-500";

                  return (
                    <div key={idx}>
                      <div className="flex justify-between items-end mb-1">
                        <span className="text-sm font-bold text-slate-700 flex items-center">
                          <span className={`w-2 h-2 rounded-full mr-2 ${colorClass}`}></span>
                          {src}
                        </span>
                        <div className="text-right">
                          <span className="text-sm font-black text-slate-900">RM {val.toLocaleString()}</span>
                          <span className="text-[10px] font-bold text-slate-400 ml-2">({percent.toFixed(1)}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden mt-1">
                        <div className={`${colorClass} h-full rounded-full`} style={{ width: `${percent}%` }}></div>
                      </div>
                    </div>
                  );
                }) : <div className="text-center py-4 text-slate-400 text-sm">No source data available.</div>}
              </div>
            </div>

            {/* SALES BY PRODUCT */}
            <div className="bg-white p-7 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-6">Sales By Product</h3>
              <div className="space-y-6">
                {topProducts.length > 0 ? topProducts.map((prod, idx) => {
                  const percent = (prod[1] / maxProductSales) * 100;
                  return (
                    <div key={idx}>
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center overflow-hidden">
                          <span className="text-[10px] font-bold text-slate-400 w-4">{idx + 1}</span>
                          <span className="text-sm font-bold text-slate-700 truncate max-w-[200px]">{prod[0]}</span>
                        </div>
                        <span className="text-sm font-black text-blue-600">RM {prod[1].toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-slate-50 rounded-full h-1.5 overflow-hidden mt-1">
                        <div className="bg-blue-500 h-full rounded-full" style={{ width: `${percent}%` }}></div>
                      </div>
                    </div>
                  );
                }) : <div className="text-center py-4 text-slate-400 text-sm">No product data available.</div>}
              </div>
            </div>

          </div>

        </main>
      </div>
    </div>
  );
}
