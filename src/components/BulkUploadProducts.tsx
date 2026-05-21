// src/components/BulkUploadProducts.tsx
"use client"
import { bulkCreateProducts, checkExistingSkus, checkExistingGroups } from '../actions/woodslab'
import { useState } from 'react'
import * as XLSX from 'xlsx'

import { 
  FileUp, CheckCircle, AlertCircle, Loader2, 
  Table as TableIcon, Trash2, Save, X, Layers, Hammer, Info 
} from 'lucide-react'

const SLAB_TYPES = [
  "Wood slabs",
  "Small table",
  "Leg",
  "Chair/Stool",
  "Cabinet",
  "Table",
  "Small Furniture",
]

type SelectedType = string | null

export default function BulkUploadProducts() {
  const [data, setData] = useState<any[]>([])
  // ✅ State ไว้เก็บ SKU ที่ซ้ำกับในระบบ
  const [existingSkus, setExistingSkus] = useState<Set<string>>(new Set()) 
  const [newGroupCount, setNewGroupCount] = useState<number>(0) 
  // ✅ State เก็บรายชื่อ Group ID (Product Sup) ที่ชนกันในระบบ
  const [existingGroupIds, setExistingGroupIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info', msg: string } | null>(null)

  const [defaultCategory, setDefaultCategory] = useState<'SLABS' | 'rough_wood' | 'prop'>('SLABS')
  const [selectedType, setSelectedType] = useState<SelectedType>(null)
  // ✅ FilterMode สำหรับเลือกดูสินค้า (ALL = ทั้งหมด, NEW = ของใหม่, UPDATE = ของเดิม)
  const [filterMode, setFilterMode] = useState<'ALL' | 'NEW' | 'UPDATE'>('ALL')

  const handleSelectType = (type: SelectedType) => {
    setSelectedType(type)
    if (type === 'rough_wood') setDefaultCategory('rough_wood')
    else if (type === 'prop') setDefaultCategory('prop')
    else setDefaultCategory('SLABS')
  }

  const parseDims = (sizeText: string) => {
    const nums = sizeText.match(/(\d+(?:\.\d+)?)/g)?.map(Number) || []
    if (nums.length < 3) return null
    return { l: nums[0], w: nums.length > 3 ? Math.max(...nums.slice(1, -1)) : nums[1], t: nums[nums.length - 1] }
  }

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    if (selectedType === 'prop') {
      const propTemplate = [{
        "Stock": 1,
        "Item NO.": "3D102672W06",
        "Factory": "Merlin",
        "Name Product": "Ceramic Handmade vase",
        "Group Sisz": "L",
        "Link Picture": "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/...",
        "Description": "",
        "Collection": "3D1026",
        "Product Sup": "Vase",
        "Material": "Ceramic",
        "Color": "White",
        "CODE/SKU": "ML-VA-CR-3D102672W06",
        "W": 21.5,
        "D": 21.5,
        "H": 30,
        "Cost TH": 1160,
        "Price": 4100
      }];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(propTemplate), "Props Template");
      XLSX.writeFile(wb, "props_import_template.xlsx");
    } else {
      const templateHeader = [{
        Barcode: "BX001",
        sku: "WOODSLABS-001",
        name: "ไม้แผ่นตัวอย่าง",
        category_id: "SLABS",
        color: "Natural",
        unit: "แผ่น",
        description: "ไม้เนื้อแข็งลายสวยงาม",
        cost: 0,
        price: 5000,
        status: "active",
        image_url: "https://.../main.webp",
        size: "200-80-5 CM",
        width: 80,
        length: 200,
        thickness: 5,
        weight: 25,
        material: "Beech Wood",
        finish: "Wood Wax Oil",
        grade: "A",
        spec_type: "Wood slabs",
        panel_design: "Natural",
        edge_design: "Live Edge",
        color_craft: "Original",
        panel_craft: "Solid",
      }];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(templateHeader), "Template");
      XLSX.writeFile(wb, "product_import_template.xlsx");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true) 
    const reader = new FileReader()
    reader.onload = async (evt) => { 
      try {
        const bstr = evt.target?.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const rawJson = XLSX.utils.sheet_to_json(ws)
        
        const processed = rawJson.map((row: any, idx: number) => {
         // --- Props mode ---
          if (selectedType === 'prop') {
            const itemNo = row["Item NO."]?.toString() || row["item_no"]?.toString() || `PROP-${Date.now()}-${idx}`
            const codeSku = row["CODE/SKU"]?.toString() || row["code_sku"]?.toString() || ""
            
            const w = row["W"] != null ? Number(row["W"]) : null
            const d = row["D"] != null ? Number(row["D"]) : null
            const h = row["H"] != null ? Number(row["H"]) : null
            const stockNum = row["Stock"] != null ? Number(row["Stock"]) : 0
            
            // จัดการตัวเลขที่อาจมีลูกน้ำ (,) ติดมา
            const rawCostTh = row["Cost TH"] || row["cost_th"] || 0;
            const costTh = Number(rawCostTh.toString().replace(/,/g, ''));
            
            const rawPrice = row["Price"] || row["ราคาตั้งปัดเศษ"] || 0;
            const priceRounded = Number(rawPrice.toString().replace(/,/g, ''));

            // รองรับ Header ใหม่ (ใช้ || ดักของเก่าไว้ด้วยเผื่อมีคนใช้ฟอร์แมตเดิม)
            const collectionGroupId = row["Collection"]?.toString() || row["Collection Group"]?.toString() || null
            const productSupValue = row["Product Sup"]?.toString() || null 
            const factoryName = row["Factory"]?.toString() || row["ชื่อโรงงาน"]?.toString() || null
            const productName = row["Name Product"]?.toString() || row["name"]?.toString() || `Prop - ${itemNo}`

            return {
              name: productName, 
              sku: itemNo, 
              barcode: codeSku, 
              color: row["Color"]?.toString() || row["color"]?.toString() || null,
              category_id: "prop",
              image_url: row["Link Picture"]?.toString() || (codeSku ? `https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/props/${codeSku}.png` : null),
              status: "active",
              cost: costTh,
              price: priceRounded,
              weight: 0,
              unit: "ชิ้น",
              description: row["Description"]?.toString() || null,
              
              collection_group_id: collectionGroupId, 
              _temp_product_sup: productSupValue, 
              
              specs: {
                width_cm: w,
                length_cm: d,
                thickness_cm: h,
                brand: factoryName,
                group_size: row["Group Sisz"]?.toString() || row["Group Size"]?.toString() || null,
                product_sup: productSupValue, 
                material: row["Material"]?.toString() || null,
                stock: stockNum, 
              }
            }
          }

          // --- SLABS / Rough Wood mode ---
          const resolvedSpecType = row.spec_type || (selectedType !== 'rough_wood' ? selectedType : undefined) || undefined
          const specs: any = {
            material: row.material,
            finish: row.finish,
            grade: row.grade,
            spec_type: resolvedSpecType,
            type: resolvedSpecType,
            panel_design: row.panel_design,
            edge_design: row.edge_design,
            color_craft: row.color_craft,
            panel_craft: row.panel_craft,
          }

          if (row.size) {
            const dims = parseDims(row.size.toString())
            if (dims) {
              specs.size = row.size;
              specs.length_cm = dims.l;
              specs.width_cm = dims.w;
              specs.thickness_cm = dims.t;
            }
          } else if (row.length && row.width && row.thickness) {
            specs.size = `${row.length}-${row.width}-${row.thickness} MM`;
            specs.length_cm = Number(row.length);
            specs.width_cm = Number(row.width);
            specs.thickness_cm = Number(row.thickness);
          }

          const extraImages: any[] = []
          Object.keys(row).forEach(key => {
            if (key.startsWith('images_') && row[key]) {
              extraImages.push({ path: row[key], role: "extra", sort: parseInt(key.split('_')[1] || "1") })
            }
          })
          specs.images = extraImages
          specs.images_count = extraImages.length

          let finalCategory = defaultCategory;
          if (row.category_id) {
            finalCategory = row.category_id;
          } else if (row.sku?.toString().toUpperCase().startsWith('ROUGH')) {
            finalCategory = 'rough_wood';
          }

          return {
            name: row.name || "Untitled Product",
            barcode: row.Barcode?.toString() || row.barcode?.toString(),
            sku: row.sku?.toString() || `WOODSLABS-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
            image_url: row.image_url,
            status: row.status || 'active',
            cost: Number(row.cost?.toString().replace(/[^0-9.]/g, '') || 0),
            price: Number(row.price?.toString().replace(/[^0-9.]/g, '') || 0),
            weight: Number(row.weight || 0),
            specs: specs,
            category_id: finalCategory,
            color: row.color?.toString() || null,
            unit: row.unit?.toString() || 'แผ่น',
            description: row.description?.toString() || null
          }
        })

        // กรองข้อมูลที่ SKU ซ้ำกันในไฟล์ออก
        const uniqueData = Array.from(
          new Map(processed.map((item) => [item.sku, item])).values()
        );

        // เช็ค Database ว่ามี SKU ไหนอยู่แล้วบ้าง
        const skusToCheck = uniqueData.map(item => item.sku);
        const { existing } = await checkExistingSkus(skusToCheck);
        setExistingSkus(new Set(existing));

        // ✅ เช็คคอลัมน์กลุ่มสินค้า (Product Sup) ที่ซ้ำ/ชนกันในระบบ
        const uniqueGroups = Array.from(
          new Set(
            uniqueData
              .map(item => item.collection_group_id)
              .filter(id => id != null && id !== '')
          )
        );

        if (uniqueGroups.length > 0) {
          const { existing: existingGroups } = await checkExistingGroups(uniqueGroups);
          // จำนวนกลุ่มที่จะสร้างใหม่จริงๆ
          setNewGroupCount(uniqueGroups.length - existingGroups.length);
          // ✅ เก็บรายชื่อคำหมวดหมู่ที่ชน (เช่น Vase, Doll Animal) เอาไปแสดงในกล่องเตือนแอดมิน
          setExistingGroupIds(existingGroups);
        } else {
          setNewGroupCount(0);
          setExistingGroupIds([]);
        }

        setData(uniqueData)
      } catch (err) {
        setStatus({ type: 'error', msg: 'อ่านไฟล์ผิดพลาด โปรดตรวจสอบรูปแบบไฟล์' })
      } finally {
        setLoading(false)
      }
    }
    reader.readAsBinaryString(file)
  }

  const handleSaveAll = async () => {
    if (data.length === 0) return
    setLoading(true)
    const res = await bulkCreateProducts(data)
    setLoading(false)

    if (res.error) {
      setStatus({ type: 'error', msg: res.error })
    } else {
      setStatus({ type: 'success', msg: `นำเข้าและอัปเดตข้อมูลสำเร็จ ${res.count} รายการ!` })
      setData([])
      setExistingSkus(new Set())
      setExistingGroupIds([])
    }
  }

  // คำนวณจำนวนที่สร้างใหม่ และ อัปเดต
  const newItemsCount = data.filter(item => !existingSkus.has(item.sku)).length;
  const updatedItemsCount = data.filter(item => existingSkus.has(item.sku)).length;
  const displayedData = data.filter(item => {
    if (filterMode === 'ALL') return true;
    const isUpdate = existingSkus.has(item.sku);
    if (filterMode === 'NEW') return !isUpdate;
    if (filterMode === 'UPDATE') return isUpdate;
    return true;
  });

  return (
    <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-200">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileUp className="text-blue-600" /> นำเข้าข้อมูลสินค้า (Bulk Upload)
          </h2>
          <p className="text-slate-500 text-xs mt-1">อัปโหลดไฟล์ Excel เพื่อเพิ่มหรืออัปเดตสินค้าทีละหลายรายการ (อิงตาม SKU)</p>
        </div>
        
        <div className="flex gap-2">
          <button 
            type="button"
            onClick={downloadTemplate}
            className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2"
          >
            <TableIcon className="w-4 h-4" /> ดาวน์โหลดไฟล์ตัวอย่าง
          </button>
          
          {data.length > 0 && (
            <button 
              onClick={handleSaveAll} 
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
              ยืนยันนำเข้าข้อมูล
            </button>
          )}
        </div>
      </div>

      {/* เลือกประเภทสินค้าก่อน Import */}
      {data.length === 0 && !loading && (
        <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <p className="text-sm font-bold text-slate-700 mb-3">เลือกประเภทสินค้าที่ต้องการ Import:</p>
          
          {/* SLABS types */}
          <div className="mb-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
              <Layers size={12} /> Wood Slabs
            </p>
            <div className="flex flex-wrap gap-2">
              {SLAB_TYPES.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleSelectType(t)}
                  className={`px-3 py-2 rounded-lg border-2 text-sm font-semibold transition-all
                    ${selectedType === t ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Rough Wood */}
          <div className="border-t border-slate-200 pt-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
              <Hammer size={12} /> Rough Wood
            </p>
            <button
              type="button"
              onClick={() => handleSelectType('rough_wood')}
              className={`px-3 py-2 rounded-lg border-2 text-sm font-semibold transition-all
                ${selectedType === 'rough_wood' ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-orange-300 hover:text-orange-600'}`}
            >
              Rough Wood (ไม้ดิบ)
            </button>
          </div>

          {/* Props */}
          <div className="border-t border-slate-200 pt-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
              🖼️ Props / Decor
            </p>
            <button
              type="button"
              onClick={() => handleSelectType('prop')}
              className={`px-3 py-2 rounded-lg border-2 text-sm font-semibold transition-all
                ${selectedType === 'prop' ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-purple-300 hover:text-purple-600'}`}
            >
              Props / Decor (สินค้าประกอบฉาก)
            </button>
          </div>
        </div>
      )}

      {/* Upload Zone */}
      {data.length === 0 && (
        <div className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center transition-all relative
          ${selectedType === null ? 'border-slate-200 bg-slate-100 cursor-not-allowed opacity-50' : 'border-slate-300 bg-slate-50 hover:bg-blue-50 hover:border-blue-400 cursor-pointer'}`}>
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileUpload}
            disabled={selectedType === null || loading}
            className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          <div className="bg-white p-4 rounded-full shadow-md mb-4">
            {loading ? <Loader2 className="w-8 h-8 text-blue-500 animate-spin" /> : <FileUp className={`w-8 h-8 ${selectedType === null ? 'text-slate-300' : 'text-blue-500'}`} />}
          </div>
          <p className="text-slate-600 font-medium">
            {loading ? 'กำลังประมวลผลข้อมูล...' : selectedType === null ? 'เลือกประเภทสินค้าก่อน แล้วค่อยอัปโหลดไฟล์' : 'คลิกหรือลากไฟล์ Excel / CSV มาวางที่นี่'}
          </p>
        </div>
      )}

      {/* Preview Table */}
      {data.length > 0 && !loading && (
        <div className="space-y-4">
          
          {/* สรุปยอดฟิลเตอร์ */}
          <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex flex-wrap gap-2">

              {newGroupCount > 0 && (
                <div className="px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 bg-purple-100 text-purple-800 border border-purple-200 shadow-sm cursor-default">
                  🏷️ จะสร้างหมวดหมู่ใหม่: {newGroupCount} หมวดหมู่
                </div>
              )}
              {/* ปุ่มดูทั้งหมด */}
              <button 
                onClick={() => setFilterMode('ALL')}
                className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all 
                  ${filterMode === 'ALL' ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
              >
                ทั้งหมด ({data.length})
              </button>
              
              {/* ปุ่มดูเฉพาะของใหม่ */}
              <button 
                onClick={() => setFilterMode('NEW')}
                className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all 
                  ${filterMode === 'NEW' ? 'bg-green-500 text-white shadow-md ring-2 ring-green-300 ring-offset-1' : 'bg-green-100 text-green-800 hover:bg-green-200 opacity-80'}`}
              >
                ✨ สร้างใหม่: {newItemsCount} รายการ
              </button>

              {/* ปุ่มดูเฉพาะอัปเดต */}
              <button 
                onClick={() => setFilterMode('UPDATE')}
                className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all 
                  ${filterMode === 'UPDATE' ? 'bg-blue-500 text-white shadow-md ring-2 ring-blue-300 ring-offset-1' : 'bg-blue-100 text-blue-800 hover:bg-blue-200 opacity-80'}`}
              >
                🔄 อัปเดตของเดิม: {updatedItemsCount} รายการ
              </button>
            </div>
            <button onClick={() => {setData([]); setStatus(null); setExistingSkus(new Set()); setExistingGroupIds([]); setFilterMode('ALL');}} className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2 transition mt-3 sm:mt-0">
              <Trash2 className="w-4 h-4" /> ล้างข้อมูล
            </button>
          </div>

          {/* ✅ Alert UI แจ้งเตือนเมื่อกลุ่ม (Collection Group) ชนกัน */}
          {existingGroupIds.length > 0 && (
            <div className="w-full mt-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm shadow-sm animate-in fade-in duration-300">
              <p className="font-bold flex items-center gap-2 text-amber-700">
                <AlertCircle size={18} className="shrink-0" /> พบรหัสกลุ่มสินค้า (Collection Group) ที่มีอยู่แล้วในระบบ {existingGroupIds.length} รายการ
              </p>
              <p className="mt-1 text-xs text-amber-600 md:ml-6">
                สินค้าใหม่เหล่านี้จะถูกนำไปผูกเข้ากับรหัสกลุ่มเดิมโดยอัตโนมัติ (และจะอัปเดตค่า Product Sup ให้เป็นของล่าสุด)
              </p>
              <div className="md:ml-6 mt-2 flex flex-wrap gap-1.5">
                {/* โชว์แค่ 15 อันแรก จะได้ไม่รกหน้าจอ */}
                {existingGroupIds.slice(0, 15).map(id => (
                  <span key={id} className="px-2 py-0.5 bg-amber-200/60 text-amber-900 border border-amber-300/80 rounded text-[11px] font-bold shadow-sm">
                    📁 {id}
                  </span>
                ))}
                {/* ถ้ามีมากกว่า 15 อัน ให้แสดงป้ายบอกว่ามีอีกเท่าไหร่ */}
                {existingGroupIds.length > 15 && (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 border border-amber-200 rounded text-[11px] font-bold shadow-sm">
                    + มีอีก {existingGroupIds.length - 15} รายการที่ซ้ำ
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="overflow-x-auto border rounded-xl max-h-[500px] overflow-y-auto mt-4">
            <table className="w-full text-left text-sm border-collapse relative">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="p-3 border-b text-center">Status</th> 
                  <th className="p-3 border-b">SKU</th>
                  {selectedType === 'prop' ? (
                    <>
                      <th className="p-3 border-b">Barcode</th>
                      <th className="p-3 border-b">Color</th>
                      <th className="p-3 border-b">Material</th>
                      <th className="p-3 border-b text-center">W x D x H</th>
                      <th className="p-3 border-b text-right">Price</th>
                    </>
                  ) : (
                    <>
                      <th className="p-3 border-b">Category</th>
                      <th className="p-3 border-b">Name</th>
                      <th className="p-3 border-b">Size</th>
                      <th className="p-3 border-b text-right">Price</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {displayedData.map((item, idx) => {
                  const isUpdate = existingSkus.has(item.sku);
                  
                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition border-b border-slate-100 last:border-0">
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${isUpdate ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                          {isUpdate ? '🔄 Update' : '✨ New'}
                        </span>
                      </td>
                      
                      <td className="p-3 font-mono text-xs font-bold text-slate-800">{item.sku}</td>
                      
                      {selectedType === 'prop' ? (
                        <>
                          <td className="p-3 font-mono text-xs text-slate-500">{item.barcode || '-'}</td>
                          <td className="p-3 text-xs">{item.color || '-'}</td>
                          <td className="p-3 text-xs">{item.specs.material || '-'}</td>
                          <td className="p-3 text-center text-xs font-medium text-slate-600">
                            {item.specs.width_cm || '-'} x {item.specs.length_cm || '-'} x {item.specs.thickness_cm || '-'}
                          </td>
                          <td className="p-3 text-right text-blue-600 font-bold">{item.price.toLocaleString()}</td>
                        </>
                      ) : (
                        <>
                          <td className="p-3">
                            <span className="px-2 py-1 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                              {item.category_id}
                            </span>
                          </td>
                          <td className="p-3 font-medium text-slate-800">{item.name}</td>
                          <td className="p-3 text-slate-500 text-xs">{item.specs.size || '-'}</td>
                          <td className="p-3 text-right text-blue-600 font-bold">{item.price.toLocaleString()}</td>
                        </>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Feedback Toast */}
      {status && (
        <div className={`mt-4 p-4 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 
          ${status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 
            status.type === 'info' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 
            'bg-red-50 text-red-700 border border-red-200'}`}
        >
          {status.type === 'success' ? <CheckCircle className="w-5 h-5" /> : 
           status.type === 'info' ? <Info className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="text-sm font-bold">{status.msg}</span>
          <button onClick={() => setStatus(null)} className="ml-auto hover:bg-white/50 p-1 rounded-full transition"><X className="w-4 h-4" /></button>
        </div>
      )}
    </div>
  )
}