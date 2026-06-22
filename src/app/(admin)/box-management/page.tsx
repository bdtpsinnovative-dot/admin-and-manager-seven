"use client";

import { useState, useEffect } from "react";
import { getBoxes, updateBoxImage, getPropsWithSuggestedBoxes, addBox, updateBox } from "@/actions/boxActions";

export default function BoxManagementPage() {
  const [activeTab, setActiveTab] = useState<"manage" | "calc">("manage");
  const [boxes, setBoxes] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // States สำหรับฟิลเตอร์และการคำนวณยอด
  const [filterNoBox, setFilterNoBox] = useState(false);
  const [calcMode, setCalcMode] = useState<"unit" | "stock">("unit"); 
  
  const [showModal, setShowModal] = useState(false);
  const [editingBoxId, setEditingBoxId] = useState<number | null>(null);
  const [newBox, setNewBox] = useState({
    name: "", box_type: "STANDARD", width_cm: 0, length_cm: 0, height_cm: 0, max_weight_kg: 0, image_url: ""
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === "manage") {
        const boxData = await getBoxes();
        setBoxes(boxData);
      } else {
        const prodData = await getPropsWithSuggestedBoxes();
        setProducts(prodData);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingBoxId(null);
    setNewBox({ name: "", box_type: "STANDARD", width_cm: 0, length_cm: 0, height_cm: 0, max_weight_kg: 0, image_url: "" });
    setShowModal(true);
  };

  const handleOpenEdit = (box: any) => {
    setEditingBoxId(box.id);
    setNewBox({ ...box }); 
    setShowModal(true);
  };

  const handleSaveBox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBox.name || newBox.width_cm <= 0) return alert("กรุณากรอกข้อมูลให้ครบถ้วน");
    
    try {
      if (editingBoxId) {
        await updateBox(editingBoxId, newBox);
        alert("อัปเดตข้อมูลกล่องสำเร็จ!");
      } else {
        await addBox(newBox);
        alert("เพิ่มกล่องใหม่สำเร็จ!");
      }
      setShowModal(false);
      fetchData(); 
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  };

  const displayProducts = filterNoBox ? products.filter(p => !p.suggested_box) : products;

  // 💡 1. คำนวณสรุปยอดกล่องรายไซส์
  const boxSummary = products.reduce((acc, prod) => {
    if (prod.suggested_box) {
      const boxName = prod.suggested_box.box_name;
      const qty = calcMode === "stock" ? (prod.stock_qty || 0) : 1;
      
      if (qty > 0) {
        acc[boxName] = (acc[boxName] || 0) + qty;
      }
    }
    return acc;
  }, {} as Record<string, number>);

  // 💡 2. คำนวณยอดรวมทั้งหมด (Grand Total)
  const totalBoxes = (Object.values(boxSummary) as number[]).reduce((sum, count) => sum + count, 0);

  // 💡 3. คำนวณยอดรวมสินค้าที่ "หากล่องไม่ได้" (NO BOX)
  const unboxedCount = products.reduce((sum, prod) => {
    if (!prod.suggested_box) {
      const qty = calcMode === "stock" ? (prod.stock_qty || 0) : 1;
      return sum + (qty > 0 ? qty : 0);
    }
    return sum;
  }, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gray-50 text-gray-900 min-h-screen font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-gray-200 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">📦 ระบบจัดการและคำนวณขนาดกล่อง</h1>
          <p className="text-gray-500 text-sm mt-1">โมดูลคำนวณบรรจุภัณฑ์สำหรับสินค้า Prop</p>
        </div>
        
        <div className="flex gap-2 bg-gray-200/50 p-1 rounded-lg">
          <button onClick={() => setActiveTab("manage")} className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === "manage" ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"}`}>
            ⚙️ จัดการข้อมูลกล่อง
          </button>
          <button onClick={() => setActiveTab("calc")} className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === "calc" ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"}`}>
            🔍 ดูผลลัพธ์การคำนวณสินค้า
          </button>
        </div>
      </div>

      {loading && <p className="text-center py-10 text-gray-500">กำลังโหลดข้อมูล...</p>}

      {/* TAB 1: หน้าจัดการกล่อง */}
      {!loading && activeTab === "manage" && (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={handleOpenAdd} className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-md text-sm font-medium shadow-sm transition">
              + เพิ่มกล่องใหม่
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {boxes.map((box) => (
              <div key={box.id} className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex gap-4 items-start relative">
                <div className="w-24 h-24 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center overflow-hidden shrink-0 p-1">
                  {box.image_url ? <img src={box.image_url} alt={box.name} className="object-contain w-full h-full" /> : <span className="text-[10px] text-gray-400">ไม่มีรูปภาพ</span>}
                </div>
                <div className="flex-1">
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100">{box.box_type}</span>
                  <h3 className="text-lg font-bold text-gray-900 mt-1">กล่องไซส์: {box.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">ขนาด: {box.width_cm} x {box.length_cm} x {box.height_cm} cm | รับน้ำหนัก: {box.max_weight_kg} kg</p>
                  <div className="mt-3">
                    <button onClick={() => handleOpenEdit(box)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-4 py-1.5 rounded transition shadow-sm">
                      แก้ไขข้อมูล
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* TAB 2: หน้าแสดงผลลัพธ์ */}
      {!loading && activeTab === "calc" && (
        <>
          {/* 📊 แผงสรุปยอดสั่งกล่อง */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                🛒 สรุปจำนวนแพคเกจจิ้ง
              </h2>
              
              {/* ปุ่มสลับโหมดการนับยอด */}
              <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                <button 
                  onClick={() => setCalcMode("unit")} 
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${calcMode === "unit" ? "bg-white text-blue-600 shadow-sm border border-gray-200" : "text-gray-500 hover:text-gray-800"}`}
                >
                  นับแบบ 1 ชิ้น / รายการ
                </button>
                <button 
                  onClick={() => setCalcMode("stock")} 
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${calcMode === "stock" ? "bg-white text-blue-600 shadow-sm border border-gray-200" : "text-gray-500 hover:text-gray-800"}`}
                >
                  📦 นับตามจำนวนสต็อกจริง
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-4 items-stretch">
              
              {/* 🏆 แผงยอดรวมกล่องทั้งหมด (ทำสีดำเด่นๆ) */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 flex items-center gap-4 min-w-[150px] shadow-md">
                <div>
                  <p className="text-[10px] text-gray-400 font-bold mb-0.5">รวมมีกล่อง</p>
                  <p className="font-bold text-white leading-none">TOTAL</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-3xl font-black text-white leading-none">{totalBoxes.toLocaleString()}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">ใบ</p>
                </div>
              </div>

              {/* ❌ แผงยอดสินค้าที่หากล่องไม่ได้ (กดเพื่อฟิลเตอร์ได้เลย) */}
              <button
                onClick={() => setFilterNoBox(!filterNoBox)}
                className={`border rounded-xl px-5 py-4 flex items-center gap-4 min-w-[150px] shadow-sm transition-all text-left group ${
                  filterNoBox 
                    ? "bg-red-600 border-red-700 text-white ring-2 ring-red-300 ring-offset-2" 
                    : "bg-red-50 hover:bg-red-100 border-red-200 text-red-700 hover:shadow-md"
                }`}
              >
                <div>
                  <p className={`text-[10px] font-bold mb-0.5 transition-colors ${filterNoBox ? "text-red-200" : "text-red-500 group-hover:text-red-600"}`}>
                    {filterNoBox ? "กำลังแสดง" : "กดดูรายการ"}
                  </p>
                  <p className="font-bold leading-none">หากล่องไม่ได้</p>
                </div>
                <div className="ml-auto text-right">
                  <p className={`text-3xl font-black leading-none transition-colors ${filterNoBox ? "text-white" : "text-red-600"}`}>
                    {unboxedCount.toLocaleString()}
                  </p>
                  <p className={`text-[10px] mt-0.5 transition-colors ${filterNoBox ? "text-red-200" : "text-red-500"}`}>
                    ชิ้น
                  </p>
                </div>
              </button>

              {/* ขีดคั่นกลาง */}
              <div className="hidden sm:block w-px bg-gray-200 my-2 mx-2"></div>

              {/* แผงยอดแยกตามไซส์ */}
              {Object.keys(boxSummary).length === 0 ? (
                <div className="flex items-center px-4">
                  <p className="text-sm text-gray-400">ยังไม่มีข้อมูลกล่องให้สรุปยอด</p>
                </div>
              ) : (
                (Object.entries(boxSummary) as [string, number][]).sort((a,b) => b[1] - a[1]).map(([boxName, count]) => (
                  <div key={boxName} className="bg-blue-50/50 border border-blue-100 rounded-xl px-4 py-3 flex items-center gap-3 min-w-[120px]">
                    <div>
                      <p className="text-[10px] uppercase text-blue-500 font-bold mb-0.5">ไซส์</p>
                      <p className="font-bold text-gray-800 leading-none">{boxName}</p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-2xl font-black text-blue-600 leading-none">{count.toLocaleString()}</p>
                      <p className="text-[10px] text-blue-500 mt-0.5">ใบ</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* กล่องแสดงผลลัพธ์รายการสินค้า */}
          <div className="space-y-4">
            {displayProducts.length === 0 ? (
              <p className="text-center text-gray-500 py-8">ไม่มีข้อมูลสินค้าในหมวดหมู่นี้</p>
            ) : (
              displayProducts.map((prod) => (
                <div key={prod.id} className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                  
                  {/* ฝั่งซ้าย: ข้อมูลและรูปสินค้า */}
                  <div className="flex-1 w-full flex items-start gap-4">
                    <div className="w-20 h-20 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center overflow-hidden shrink-0 p-1">
                      {prod.image_url ? <img src={prod.image_url} alt={prod.name} className="object-cover w-full h-full rounded" /> : <span className="text-[10px] text-gray-400 text-center">ไม่มีรูป<br/>สินค้า</span>}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono border border-gray-200">ID: {prod.id}</span>
                        <h2 className="text-base font-semibold text-gray-900">{prod.name}</h2>
                        <span className="ml-2 text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                          ในสต็อก: {prod.stock_qty || 0} ชิ้น
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs bg-gray-50 p-3 rounded-lg border border-gray-100 text-gray-700">
                        <div><span className="text-gray-400 block">กว้าง (W)</span> {prod.prop_w || 0} cm</div>
                        <div><span className="text-gray-400 block">ลึก (D)</span> {prod.prop_d || 0} cm</div>
                        <div><span className="text-gray-400 block">สูง (H)</span> {prod.prop_h || 0} cm</div>
                        <div><span className="text-gray-400 block">น้ำหนัก</span> {prod.weight || 0} kg</div>
                      </div>
                    </div>
                  </div>

                  <div className="text-gray-300 hidden md:block text-xl">➔</div>

                  {/* ฝั่งขวา: กล่องพัสดุ */}
                  <div className={`w-full md:w-80 border rounded-xl p-4 flex items-center gap-4 ${prod.suggested_box ? 'bg-blue-50/50 border-blue-100' : 'bg-red-50/50 border-red-100'}`}>
                    <div className="w-16 h-16 bg-white border border-gray-200 rounded-lg flex items-center justify-center p-1 overflow-hidden shrink-0">
                      {prod.suggested_box?.box_image_url ? <img src={prod.suggested_box.box_image_url} alt="box" className="object-contain h-full w-full" /> : <span className="text-[24px]">📦❓</span>}
                    </div>
                    <div className="flex-1">
                      {prod.suggested_box ? (
                        <>
                          <span className="text-[10px] uppercase font-bold text-white px-2 py-0.5 rounded-full bg-blue-600">
                            แนะนำไซส์ {prod.suggested_box.box_name}
                          </span>
                          <h3 className="font-medium text-sm mt-1 text-gray-800">
                            กล่องพัสดุสำหรับจัดส่ง
                          </h3>
                        </>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <h3 className="font-bold text-[11px] text-red-600 leading-snug">{prod.advanceReason || "⚠️ ไม่มีกล่องที่รองรับ"}</h3>
                          {prod.customSuggest && (
                            <div className="mt-1 p-1.5 bg-white/60 rounded border border-red-200">
                              <p className="text-[10px] text-red-800 font-medium">💡 ควรใช้กล่องอย่างน้อย:</p>
                              <p className="text-xs font-bold text-red-700 font-mono tracking-tight">{prod.customSuggest}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Modal สำหรับเพิ่ม/แก้ไขกล่อง (เหมือนเดิม) */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-md w-full p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">{editingBoxId ? `แก้ไขข้อมูลกล่อง: ${newBox.name}` : "เพิ่มขนาดกล่องใหม่"}</h2>
            <form onSubmit={handleSaveBox} className="space-y-4">
              {/* ฟอร์ม input... */}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs text-gray-500 mb-1">ชื่อกล่อง (เช่น XXL)</label><input type="text" required value={newBox.name} className="w-full bg-white border border-gray-300 text-gray-900 rounded p-2 text-sm focus:border-blue-500 outline-none" onChange={(e) => setNewBox({...newBox, name: e.target.value})} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">ประเภท</label><select value={newBox.box_type} className="w-full bg-white border border-gray-300 text-gray-900 rounded p-2 text-sm focus:border-blue-500 outline-none" onChange={(e) => setNewBox({...newBox, box_type: e.target.value})}><option value="STANDARD">STANDARD</option><option value="FLAT">FLAT</option></select></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-xs text-gray-500 mb-1">กว้าง (cm)</label><input type="number" step="0.1" required value={newBox.width_cm} className="w-full bg-white border border-gray-300 text-gray-900 rounded p-2 text-sm focus:border-blue-500 outline-none" onChange={(e) => setNewBox({...newBox, width_cm: parseFloat(e.target.value)})} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">ยาว (cm)</label><input type="number" step="0.1" required value={newBox.length_cm} className="w-full bg-white border border-gray-300 text-gray-900 rounded p-2 text-sm focus:border-blue-500 outline-none" onChange={(e) => setNewBox({...newBox, length_cm: parseFloat(e.target.value)})} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">สูง (cm)</label><input type="number" step="0.1" required value={newBox.height_cm} className="w-full bg-white border border-gray-300 text-gray-900 rounded p-2 text-sm focus:border-blue-500 outline-none" onChange={(e) => setNewBox({...newBox, height_cm: parseFloat(e.target.value)})} /></div>
              </div>
              <div><label className="block text-xs text-gray-500 mb-1">รองรับน้ำหนักสูงสุด (kg)</label><input type="number" step="0.1" required value={newBox.max_weight_kg} className="w-full bg-white border border-gray-300 text-gray-900 rounded p-2 text-sm focus:border-blue-500 outline-none" onChange={(e) => setNewBox({...newBox, max_weight_kg: parseFloat(e.target.value)})} /></div>
              <div><label className="block text-xs text-gray-500 mb-1">URL รูปภาพ (ใส่ทีหลังได้)</label><input type="text" value={newBox.image_url || ""} className="w-full bg-white border border-gray-300 text-gray-900 rounded p-2 text-sm focus:border-blue-500 outline-none" onChange={(e) => setNewBox({...newBox, image_url: e.target.value})} /></div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition">ยกเลิก</button>
                <button type="submit" className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded transition shadow-sm">บันทึกข้อมูล</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}