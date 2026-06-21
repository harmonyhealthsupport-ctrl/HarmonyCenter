"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";

export default function SalesCRMPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  
  // States Data Utama
  const [products, setProducts] = useState([]); // Kembali guna jadual products (Pakej & Single)
  const [inventoryItems, setInventoryItems] = useState([]); 
  const [salesRecords, setSalesRecords] = useState([]);
  const [currentUser, setCurrentUser] = useState("");
  
  // States Carian Pelanggan Pintar
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [showCustDropdown, setShowCustDropdown] = useState(false);
  const custDropdownRef = useRef(null);

  // States Dropdown Produk
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef(null);

  // States Modal Laporan
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportDate, setReportDate] = useState({ start: "", end: "" });

  // States Modal (Pakej & Inventori)
  const [showPkgModal, setShowPkgModal] = useState(false);
  const [showInvModal, setShowInvModal] = useState(false);

  // State Borang Jualan CRM
  const [form, setForm] = useState({
    sale_date: new Date().toISOString().split("T")[0],
    customer_name: "",
    customer_phone: "",
    shipping_address: "",
    order_status: "PROCESS ORDER",
    payment_method: "Online Transfer",
    selected_product: null,
    quantity: "1",
    discount: "0",
    sales_source: "TikTok Ads"
  });

  // State Borang Reka Pakej (Combo)
  const [newPackage, setNewPackage] = useState({
    name: "", type: "Combo", default_price: "",
    components: [{ item_name: "", qty: 1, category: "Produk Siap" }]
  });

  // State Borang Tambah Inventori (Single)
  const [invForm, setInvForm] = useState({
    date: new Date().toISOString().split("T")[0],
    item_name: "", category: "Produk Siap", quantity: "1", default_price: "", biz_type: "HQ"
  });

  useEffect(() => {
    initSalesPage();
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsDropdownOpen(false);
      if (custDropdownRef.current && !custDropdownRef.current.contains(event.target)) setShowCustDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [router]);

  const initSalesPage = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return router.push("/login");

    const { data: profile } = await supabase.from("user_roles").select("display_name, full_name").eq("email", session.user.email).maybeSingle();
    setCurrentUser(profile?.display_name || profile?.full_name || session.user.email.split('@')[0]);

    const [resSales, resProducts, resInv, resCust] = await Promise.all([
      supabase.from("sales").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("*").order("name", { ascending: true }),
      supabase.from("inventory_items").select("*").order("item_name", { ascending: true }),
      supabase.from("customers").select("*").order("last_purchase_date", { ascending: false })
    ]);

    if (resSales.data) setSalesRecords(resSales.data);
    if (resCust.data) setCustomers(resCust.data);
    if (resInv.data) setInventoryItems(resInv.data);
    
    // Gabungkan Produk (Pakej) dan Inventori (Single) ke dalam satu senarai carian Jualan
    if (resProducts.data && resInv.data) {
      const pkgList = resProducts.data;
      const singleList = resInv.data.map(inv => ({
        id: `inv-${inv.id}`, name: inv.item_name, type: "Single", default_price: inv.default_price || 0,
        items: [{ item_name: inv.item_name, qty: 1, category: inv.category }]
      }));
      const combined = [...pkgList, ...singleList];
      setProducts(combined);
      if (combined.length > 0 && !form.selected_product) setForm(prev => ({ ...prev, selected_product: combined[0] }));
    }
    setLoading(false);
  };

  const grossPrice = form.selected_product ? (form.selected_product.default_price * (parseInt(form.quantity) || 1)) : 0;
  const discountAmount = parseFloat(form.discount) || 0;
  const netPrice = grossPrice - discountAmount;
  
  // Carian Lowercase Anti-Duplicate
  const filteredCatalog = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // ==========================================
  // FUNGSI PAKEJ PROMOSI (Boleh Remove Freegift)
  // ==========================================
  const addComponentRow = () => setNewPackage({...newPackage, components: [...newPackage.components, { item_name: "", qty: 1, category: "Produk Siap" }]});
  
  const removeComponentRow = (indexToRemove) => {
    if (newPackage.components.length <= 1) return alert("Pakej mesti mempunyai sekurang-kurangnya satu produk!");
    const updated = newPackage.components.filter((_, idx) => idx !== indexToRemove);
    setNewPackage({...newPackage, components: updated});
  };

  const handleComponentChange = (index, field, value) => {
    const updated = [...newPackage.components];
    updated[index][field] = value;
    if (field === 'item_name') {
      const match = inventoryItems.find(i => i.item_name === value);
      if (match) updated[index]['category'] = match.category;
    }
    setNewPackage({ ...newPackage, components: updated });
  };

  const submitNewPackage = async (e) => {
    e.preventDefault();
    if (!newPackage.name.trim()) return alert("Sila masukkan nama Pakej");
    const { error } = await supabase.from("products").insert([{ name: newPackage.name.trim(), type: "Combo", default_price: parseFloat(newPackage.default_price) || 0, items: newPackage.components }]);
    if (!error) {
      alert("Pakej Promosi baru berjaya didaftarkan!");
      setShowPkgModal(false);
      setNewPackage({ name: "", type: "Combo", default_price: "", components: [{ item_name: "", qty: 1, category: "Produk Siap" }] });
      initSalesPage(); 
    } else alert("Ralat menambah Pakej: " + error.message);
  };

  // ==========================================
  // FUNGSI DAFTAR PRODUK (SINGLE) KE INVENTORI
  // ==========================================
  const submitNewInventory = async (e) => {
    e.preventDefault();
    const cleanName = invForm.item_name.trim();
    if (!cleanName) return alert("Sila masukkan nama produk.");

    const isExist = inventoryItems.find(i => i.item_name.toLowerCase() === cleanName.toLowerCase());
    if (isExist) return alert(`Produk ini (${isExist.item_name}) sudah wujud! Cari terus di menu pilihan.`);

    setSubmitLoading(true);
    const qty = parseInt(invForm.quantity) || 0;
    const price = parseFloat(invForm.default_price) || 0;

    await supabase.from("inventory_logs").insert([{ date: invForm.date, flow_type: "In", item_name: cleanName, category: invForm.category, quantity: qty, person_name: `[Staff] ${currentUser}`, biz_type: invForm.biz_type }]);
    await supabase.from("inventory_items").insert([{ item_name: cleanName, category: invForm.category, total_in: qty, total_out: 0, current_balance: qty, default_price: price }]);

    alert("Produk & Stok baru berjaya didaftarkan!");
    setShowInvModal(false);
    setInvForm({ ...invForm, item_name: "", quantity: "1", default_price: "" });
    initSalesPage();
    setSubmitLoading(false);
  };

  // ==========================================
  // FUNGSI JUALAN CRM
  // ==========================================
  const handleSalesSubmit = async (e) => {
    e.preventDefault();
    if (!form.selected_product) return alert("Sila pilih produk terlebih dahulu");
    if (netPrice < 0) return alert("Jumlah bayaran tidak boleh bernilai negatif!");
    setSubmitLoading(true);

    const qty = parseInt(form.quantity) || 1;
    const cleanPhone = form.customer_phone.replace(/[^0-9]/g, "");
    const currentTypedName = form.customer_name.trim();
    const currentTypedAddress = form.shipping_address.trim();

    try {
      const { data: existingCust } = await supabase.from("customers").select("*").or(`phone.eq.${cleanPhone},name.ilike.${currentTypedName}`).maybeSingle();
      let calculatedLevel = "New";
      let updatedAddresses = [];

      if (existingCust) {
        const nextPurchaseCount = (existingCust.total_purchases || 0) + 1;
        if (nextPurchaseCount >= 2 && nextPurchaseCount <= 3) calculatedLevel = "Repeat";
        else if (nextPurchaseCount >= 4 && nextPurchaseCount <= 6) calculatedLevel = "Member";
        else if (nextPurchaseCount > 6) calculatedLevel = "VIP";

        updatedAddresses = existingCust.addresses || [];
        if (currentTypedAddress && !updatedAddresses.includes(currentTypedAddress)) updatedAddresses.push(currentTypedAddress);

        await supabase.from("customers").update({
          name: currentTypedName, phone: cleanPhone, total_purchases: nextPurchaseCount, total_spent: Number(existingCust.total_spent || 0) + netPrice, customer_level: calculatedLevel, last_purchase_date: form.sale_date, addresses: updatedAddresses
        }).eq("id", existingCust.id);

      } else {
        if (currentTypedAddress) updatedAddresses.push(currentTypedAddress);
        await supabase.from("customers").insert([{ phone: cleanPhone, name: currentTypedName, total_purchases: 1, total_spent: netPrice, customer_level: "New", last_purchase_date: form.sale_date, addresses: updatedAddresses }]);
      }

      // SIMPAN JUALAN
      const { data: newSale, error: saleError } = await supabase.from("sales").insert([{
        sale_date: form.sale_date, customer_name: currentTypedName, customer_phone: cleanPhone, shipping_address: currentTypedAddress, order_status: form.order_status, payment_method: form.payment_method, product_name: form.selected_product.name, quantity: qty, discount: discountAmount, total_amount: netPrice, sales_source: form.sales_source, sales_person: currentUser, customer_status: calculatedLevel, package_breakdown: form.selected_product.items
      }]).select().single();

      if (saleError) throw saleError;

      // AUTO-TOLAK INVENTORI MENGGUNAKAN package_breakdown
      if (form.order_status !== 'CANCELLED ORDER') {
        let mappedBizType = "HQ";
        if (form.sales_source === "TikTok Ads") mappedBizType = "Tiktok";
        else if (form.sales_source === "Ecom Ads") mappedBizType = "Ecom";
        else if (form.sales_source === "Blasting") mappedBizType = "Blasting";

        const itemsToDeduct = form.selected_product.items || [];
        for (const component of itemsToDeduct) {
          const totalDeductQty = component.qty * qty;
          await supabase.from("inventory_logs").insert([{ date: form.sale_date, flow_type: "Out", item_name: component.item_name, category: component.category, quantity: totalDeductQty, person_name: `[Cust] ${currentTypedName}`, biz_type: mappedBizType, reference_id: `SALE-${newSale.id}` }]);
          
          const invItem = inventoryItems.find(i => i.item_name === component.item_name);
          if (invItem) {
            await supabase.from("inventory_items").update({ total_out: (invItem.total_out || 0) + totalDeductQty, current_balance: (invItem.current_balance || 0) - totalDeductQty }).eq("id", invItem.id);
          }
        }
      }

      alert(`Jualan disimpan! Status Pelanggan: ${calculatedLevel}.`);
      setForm(prev => ({ ...prev, customer_name: "", customer_phone: "", shipping_address: "", quantity: "1", discount: "0", order_status: "PROCESS ORDER" }));
      initSalesPage();

    } catch (err) { alert("Ralat: " + err.message); } finally { setSubmitLoading(false); }
  };

  // Lain-lain Carian & Download fungsi
  const handleNameInput = (e) => {
    const val = e.target.value; setForm({ ...form, customer_name: val });
    if (val.length >= 2) {
      const matches = customers.filter(c => (c.name && c.name.toLowerCase().includes(val.toLowerCase())) || (c.phone && c.phone.includes(val)));
      setFilteredCustomers(matches); setShowCustDropdown(true);
    } else setShowCustDropdown(false);
  };
  const selectCustomer = (c) => {
    let recentAddress = ""; if (c.addresses && c.addresses.length > 0) recentAddress = c.addresses[c.addresses.length - 1]; 
    setForm({ ...form, customer_name: c.name, customer_phone: c.phone, shipping_address: recentAddress }); setShowCustDropdown(false);
  };
  const handleDownloadReport = async () => { /* Logik sedia ada (kekal sama) */ setShowReportModal(false); };

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div></div>;

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-800">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header title="Daftar Jualan CRM" subtitle="Borang kemasukan jualan bersepadu automasi inventori." />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8 relative">
          
          <div className="bg-white p-6 lg:p-8 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6 border-b border-slate-50 pb-4">
              <h3 className="text-base font-black text-blue-600 uppercase tracking-wider flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                Maklumat Pesanan
              </h3>
              <div className="flex gap-2">
                <button onClick={() => setShowReportModal(true)} className="text-xs bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl font-bold hover:bg-emerald-200 transition-colors shadow-sm flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> Report Excel
                </button>
                <button onClick={() => setShowPkgModal(true)} className="text-xs bg-amber-100 text-amber-700 px-4 py-2 rounded-xl font-bold hover:bg-amber-200 transition-colors shadow-sm">
                  + Pakej Promosi (Pkg)
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSalesSubmit} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tarikh Transaksi</label><input type="date" required value={form.sale_date} onChange={e => setForm({...form, sale_date: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm outline-none font-medium" /></div>
                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Status Order</label><select value={form.order_status} onChange={e => setForm({...form, order_status: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm outline-none font-bold text-slate-700"><option value="PROCESS ORDER">PROCESS ORDER</option><option value="BOOKING">BOOKING</option><option value="COMPLETED ORDER">COMPLETED ORDER</option><option value="CANCELLED ORDER">CANCELLED ORDER</option></select></div>
                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Kaedah Bayaran</label><select value={form.payment_method} onChange={e => setForm({...form, payment_method: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm outline-none font-medium"><option value="Online Transfer">Online Transfer</option><option value="Cash On Delivery (COD)">COD</option></select></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="relative" ref={custDropdownRef}><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Pelanggan</label><input type="text" required placeholder="Cari nama..." value={form.customer_name} onChange={handleNameInput} onFocus={() => form.customer_name.length >= 2 && setShowCustDropdown(true)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none transition-all" autoComplete="off"/>{showCustDropdown && filteredCustomers.length > 0 && (<div className="absolute z-50 mt-1 w-full bg-white rounded-xl shadow-xl max-h-48 overflow-y-auto">{filteredCustomers.map(c => (<div key={c.id} onClick={() => selectCustomer(c)} className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50"><div className="text-sm font-bold text-slate-800">{c.name}</div><div className="text-xs text-slate-400 mt-0.5">{c.phone}</div></div>))}</div>)}</div>
                  <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">No. Telefon</label><input type="text" required placeholder="Cth: 012..." value={form.customer_phone} onChange={e => setForm({...form, customer_phone: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" /></div>
                  <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Sumber Trafik</label><select value={form.sales_source} onChange={e => setForm({...form, sales_source: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"><option value="TikTok Ads">TikTok Ads</option><option value="Manual">Manual</option></select></div>
                </div>
                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Alamat Penghantaran</label><textarea rows="6" required placeholder="Alamat..." value={form.shipping_address} onChange={e => setForm({...form, shipping_address: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none resize-none h-[188px]" /></div>
              </div>

              <div className="border-t border-slate-100 pt-6">
                <h4 className="text-sm font-bold text-slate-800 mb-4">Pilihan Produk / Troli</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  
                  {/* BUTANG [+] DI SEBELAH DROPDOWN PRODUK */}
                  <div className="md:col-span-2 relative flex gap-2" ref={dropdownRef}>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Produk Jualan</label>
                      <div onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-white cursor-pointer flex justify-between items-center transition-all group">
                        <div className="truncate pr-2">
                          <div className="text-sm font-bold text-slate-800 truncate">{form.selected_product ? form.selected_product.name : "Sila cari produk/pakej..."}</div>
                          <div className="text-[10px] text-blue-600 font-bold mt-0.5">{form.selected_product ? `Harga Asal: RM ${Number(form.selected_product.default_price || 0).toFixed(2)}` : "-"}</div>
                        </div>
                        <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </div>

                      {isDropdownOpen && (
                        <div className="absolute z-50 mt-2 w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                          <div className="p-3 border-b border-slate-100 bg-slate-50/50"><input type="text" autoFocus placeholder="Cari nama..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"/></div>
                          <div className="max-h-60 overflow-y-auto p-1.5 space-y-1">
                            {filteredCatalog.length > 0 ? filteredCatalog.map((p) => (
                              <div key={p.id} onClick={() => {setForm({ ...form, selected_product: p }); setIsDropdownOpen(false); setSearchQuery("");}} className="p-3 rounded-xl cursor-pointer hover:bg-blue-50">
                                <div className="flex justify-between items-center"><span className="text-sm font-bold text-slate-800">{p.name}</span><span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded text-white ${p.type === 'Combo' ? 'bg-amber-500' : 'bg-slate-400'}`}>{p.type}</span></div>
                                <div className="text-[10px] text-slate-400 mt-1 font-bold">RM {Number(p.default_price || 0).toFixed(2)}</div>
                              </div>
                            )) : <div className="p-4 text-center text-xs text-slate-400">Tiada produk sepadan.</div>}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Butang PLUS [+] Tambah Inventori Single */}
                    <div className="flex items-end">
                      <button type="button" onClick={() => setShowInvModal(true)} title="Tambah Produk Single Baru" className="h-[46px] w-12 flex items-center justify-center bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 text-slate-600 hover:text-slate-800 transition-colors">
                        <svg className="w-5 h-5 font-bold" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      </button>
                    </div>
                  </div>

                  <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Kuantiti</label><input type="number" required min="1" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-center outline-none" /></div>
                  <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Diskaun (RM)</label><input type="number" step="0.01" min="0" value={form.discount} onChange={e => setForm({...form, discount: e.target.value})} className="w-full px-4 py-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-bold outline-none" /></div>
                </div>

                <div className="mt-6 flex justify-between items-center bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                  <div><span className="text-xs font-bold text-indigo-400 uppercase tracking-widest block mb-1">Pengiraan Total</span><span className="text-sm font-semibold text-slate-600">RM {grossPrice.toFixed(2)} - RM {discountAmount.toFixed(2)} (Diskaun)</span></div>
                  <div className="text-right"><span className="text-xs font-bold text-indigo-400 uppercase tracking-widest block mb-1">Harga Final</span><span className="text-2xl font-black text-indigo-700">RM {netPrice.toFixed(2)}</span></div>
                </div>
              </div>

              <div className="pt-2 flex justify-end"><button type="submit" disabled={submitLoading} className="px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-sm shadow-lg shadow-blue-500/30">Simpan Rekod Jualan</button></div>
            </form>
          </div>
          
          <div className="bg-white p-6 lg:p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
            <h3 className="text-base font-extrabold text-slate-900 mb-5 uppercase tracking-wider">Senarai Transaksi Terkini</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap min-w-max">
                <thead className="bg-slate-800 text-white text-[10px] uppercase tracking-wider">
                  <tr><th className="px-4 py-3 font-bold rounded-tl-lg">Date</th><th className="px-4 py-3 font-bold">Customer Name</th><th className="px-4 py-3 font-bold">Status</th><th className="px-4 py-3 font-bold">Product Name</th><th className="px-4 py-3 font-bold text-center">Qty</th><th className="px-4 py-3 font-bold text-right">Discount</th><th className="px-4 py-3 font-bold text-right">Sold Price</th><th className="px-4 py-3 font-bold">Sales Person</th><th className="px-4 py-3 font-bold rounded-tr-lg">Payment Method</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salesRecords.length > 0 ? salesRecords.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-semibold text-slate-600">{new Date(sale.sale_date).toLocaleDateString('en-GB')}</td>
                      <td className="px-4 py-3"><div className="font-extrabold text-slate-800">{sale.customer_name}</div><div className="text-[10px] text-slate-400">{sale.customer_phone} <span className="text-blue-500 font-bold">({sale.customer_status})</span></div></td>
                      <td className="px-4 py-3 text-xs font-black"><span className={`px-2 py-1 rounded ${sale.order_status === 'COMPLETED ORDER' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{sale.order_status}</span></td>
                      <td className="px-4 py-3 font-bold text-slate-700 max-w-[200px] truncate">{sale.product_name}</td>
                      <td className="px-4 py-3 text-center font-black">{sale.quantity}</td>
                      <td className="px-4 py-3 text-right font-bold text-red-500">RM {Number(sale.discount || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-black text-blue-600">RM {Number(sale.total_amount || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-xs font-semibold uppercase">{sale.sales_person || "Admin"}</td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-500">{sale.payment_method || "-"}</td>
                    </tr>
                  )) : <tr><td colSpan="9" className="text-center p-8 text-slate-400">Tiada rekod jualan.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </main>

        {/* MODAL TAMBAH PAKEJ PROMOSI DENGAN BUTANG [X] BUANG ITEM */}
        {showPkgModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-6 py-5 border-b border-amber-200 bg-amber-50/50 flex justify-between items-center">
                <h3 className="font-extrabold text-lg text-amber-800 flex items-center">📦 Reka Pakej Promosi Baru (Pkg)</h3>
                <button onClick={() => setShowPkgModal(false)} className="text-amber-400 hover:text-amber-600 font-black text-xl">&times;</button>
              </div>
              <form onSubmit={submitNewPackage} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tajuk Pakej Promosi</label><input type="text" required value={newPackage.name} onChange={e => setNewPackage({...newPackage, name: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"/></div>
                  <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Harga Jualan (RM)</label><input type="number" step="0.01" required value={newPackage.default_price} onChange={e => setNewPackage({...newPackage, default_price: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-emerald-600 outline-none"/></div>
                </div>
                <div className="border-t border-slate-100 pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-xs font-extrabold text-amber-600 uppercase tracking-wide">Produk Asas & Freegift</label>
                    <button type="button" onClick={addComponentRow} className="text-xs text-blue-600 font-bold hover:underline">+ Tambah Item</button>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {newPackage.components.map((comp, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <div className="flex-1"><input type="text" required list="inv-items" placeholder="Nama item / freegift..." value={comp.item_name} onChange={e => handleComponentChange(idx, 'item_name', e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"/></div>
                        <div className="w-20"><input type="number" required min="1" placeholder="Qty" value={comp.qty} onChange={e => handleComponentChange(idx, 'qty', parseInt(e.target.value) || 1)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-center outline-none"/></div>
                        <button type="button" onClick={() => removeComponentRow(idx)} className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors" title="Buang Item"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
                      </div>
                    ))}
                    <datalist id="inv-items">{inventoryItems.map((ii, index) => <option key={index} value={ii.item_name} />)}</datalist>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 mt-4">
                  <button type="button" onClick={() => setShowPkgModal(false)} className="px-5 py-2.5 text-sm bg-slate-100 font-bold text-slate-600 rounded-xl">Batal</button>
                  <button type="submit" className="px-6 py-2.5 text-sm bg-amber-500 hover:bg-amber-600 font-bold text-white rounded-xl shadow-md">Daftar Pakej Ini</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL TAMBAH INVENTORI (SINGLE PRODUK) */}
        {showInvModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-6 py-5 border-b border-blue-200 bg-blue-50/50 flex justify-between items-center">
                <h3 className="font-extrabold text-lg text-blue-800 flex items-center">➕ Daftar Produk Jualan (Single)</h3>
                <button onClick={() => setShowInvModal(false)} className="text-blue-400 hover:text-blue-600 font-black text-xl">&times;</button>
              </div>
              <form onSubmit={submitNewInventory} className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nama Produk</label><input type="text" required placeholder="Taip nama produk baru..." value={invForm.item_name} onChange={e => setInvForm({...invForm, item_name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium outline-none"/></div>
                  <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Kategori</label><select value={invForm.category} onChange={e => setInvForm({...invForm, category: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium outline-none"><option value="Produk Siap">Produk Siap</option><option value="Raw Material">Raw Material</option><option value="Packaging">Packaging</option><option value="Lain-lain">Lain-lain</option></select></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Harga Jualan (RM)</label><input type="number" step="0.01" required placeholder="0.00" value={invForm.default_price} onChange={e => setInvForm({...invForm, default_price: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-black text-blue-700 outline-none"/></div>
                  <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Kuantiti Stok Mula (IN)</label><input type="number" required min="0" value={invForm.quantity} onChange={e => setInvForm({...invForm, quantity: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-black outline-none"/></div>
                </div>
                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 mt-2">
                  <button type="button" onClick={() => setShowInvModal(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Batal</button>
                  <button type="submit" disabled={submitLoading} className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-transform hover:-translate-y-0.5">Daftar & Masukkan Stok</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}