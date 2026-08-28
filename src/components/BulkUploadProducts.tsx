"use client"

import { bulkCreateProducts, checkExistingSkus, checkExistingGroups, getProducts, getAllProductsForExport } from '../actions/woodslab'
import { useState } from 'react'
import * as XLSX from 'xlsx'

import { 
  FileUp, CheckCircle, AlertCircle, Loader2, 
  Table as TableIcon, Trash2, Save, X, Layers, Hammer, Info, Armchair, DownloadCloud, Image as ImageIcon, Tag, Sparkles, RefreshCw, Folder
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
  // ✅ State เก็บรายชื่อ Group ID ที่ชนกันในระบบ
  const [existingGroupIds, setExistingGroupIds] = useState<string[]>([])
  
  // ✅ State เก็บรายชื่อกลุ่มใหม่ที่จะสร้างเพื่อเอาไปโชว์พรีวิว
  const [newGroupsPreview, setNewGroupsPreview] = useState<{id: string, product_sup: string, name?: string | null, cover_image_url?: string | null}[]>([]) 
  
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadOptions, setDownloadOptions] = useState<{ slabs: any[], rough: any[], props: any[], furniture: any[] } | null>(null)
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info', msg: string } | null>(null)

  const [defaultCategory, setDefaultCategory] = useState<'SLABS' | 'rough_wood' | 'prop' | 'furniture'>('SLABS')
  const [selectedType, setSelectedType] = useState<SelectedType>(null)
  // ✅ FilterMode สำหรับเลือกดูสินค้า (ALL = ทั้งหมด, NEW = ของใหม่, UPDATE = ของเดิม)
  const [filterMode, setFilterMode] = useState<'ALL' | 'NEW' | 'UPDATE'>('ALL')

  const handleSelectType = (type: SelectedType) => {
    setSelectedType(type)
    if (type === 'rough_wood') setDefaultCategory('rough_wood')
    else if (type === 'prop') setDefaultCategory('prop')
    else if (type === 'furniture') setDefaultCategory('furniture')
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
        "Item NO.": "3D102672W06",
        "Factory": "Merlin",
        "Name Product": "Ceramic Handmade vase",
        "Group Sisz": "L",
        "Picture": "",
        "Link Picture": "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/...",
        "Description": "",
        "Name Group": "Natural Travertine",
        "Image Group": "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/group/...",
        "Collection Group": "3D1026",
        "Product Sup": "Vase Normal",
        "Material": "Ceramic",
        "Color": "White",
        "SKU": "TR-VA-ML3D102672W06",
        "BARCODE": "ML-VA-CR-3D102672W06",
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

  const fetchDataForDownload = async () => {
    try {
      setDownloading(true);
      setStatus({ type: 'info', msg: 'กำลังประมวลผลข้อมูล (อาจใช้เวลาสักครู่เนื่องจากข้อมูลมีจำนวนมาก)...' });
      
      const { data: allProducts, error } = await getAllProductsForExport();
      
      if (error) throw new Error(error);
      if (!allProducts || allProducts.length === 0) {
        setStatus({ type: 'info', msg: 'ไม่พบข้อมูลสินค้าในระบบ' });
        setDownloading(false);
        return;
      }

      const props = allProducts.filter(p => p.category_id === 'prop');
      const furniture = allProducts.filter(p => p.category_id === 'furniture');
      const rough = allProducts.filter(p => p.category_id === 'rough_wood');
      const slabs = allProducts.filter(p => p.category_id !== 'prop' && p.category_id !== 'furniture' && p.category_id !== 'rough_wood');

      setDownloadOptions({ slabs, rough, props, furniture });
      setStatus(null);
    } catch (err: any) {
      console.error(err);
      setStatus({ type: 'error', msg: err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    } finally {
      setDownloading(false);
    }
  };

  const confirmDownload = (type: 'slabs' | 'rough' | 'props' | 'furniture' | 'all') => {
    if (!downloadOptions) return;

    try {
      const wb = XLSX.utils.book_new();

      const getSlabsData = (source: any[]) => source.map(p => ({
        Barcode: p.barcode || "",
        sku: p.sku || "",
        name: p.name || "",
        category_id: p.category_id || "",
        color: p.color || "",
        unit: p.unit || "แผ่น",
        description: p.description || "",
        cost: p.cost || 0,
        price: p.price || 0,
        status: p.status || "active",
        image_url: p.image_url || "",
        size: p.specs?.size || "",
        width: p.specs?.width_cm || "",
        length: p.specs?.length_cm || "",
        thickness: p.specs?.thickness_cm || "",
        weight: p.weight || "",
        material: p.specs?.material || "",
        finish: p.specs?.finish || "",
        grade: p.specs?.grade || "",
        spec_type: p.specs?.spec_type || p.specs?.type || "",
        panel_design: p.specs?.panel_design || "",
        edge_design: p.specs?.edge_design || "",
        color_craft: p.specs?.color_craft || "",
        panel_craft: p.specs?.panel_craft || "",
      }));

      const getPropsData = (source: any[]) => source.map(p => ({
        "Item NO.": p.factory_name || "",
        "Factory": p.specs?.brand || "",
        "Name Product": p.name || "",
        "Group Sisz": p.specs?.group_size || "",
        "Picture": "",
        "Link Picture": p.image_url || "",
        "Description": p.description || "",
        "Name Group": "", 
        "Image Group": "",
        "Collection Group": p.collection_group_id || "",
        "Product Sup": "",
        "Material": p.specs?.material || "",
        "Color": p.color || "",
        "SKU": p.sku || "",
        "BARCODE": p.barcode || "",
        "W": p.specs?.width_cm || "",
        "D": p.specs?.length_cm || "",
        "H": p.specs?.thickness_cm || "",
        "Cost TH": p.cost || 0,
        "Price": p.price || 0
      }));

      if ((type === 'slabs' || type === 'all') && downloadOptions.slabs.length > 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(getSlabsData(downloadOptions.slabs)), "Wood Slabs");
      }
      
      if ((type === 'rough' || type === 'all') && downloadOptions.rough.length > 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(getSlabsData(downloadOptions.rough)), "Rough Wood");
      }

      if ((type === 'props' || type === 'all') && downloadOptions.props.length > 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(getPropsData(downloadOptions.props)), "Props");
      }
      
      if ((type === 'furniture' || type === 'all') && downloadOptions.furniture.length > 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(getPropsData(downloadOptions.furniture)), "Furniture");
      }

      XLSX.writeFile(wb, `products_export_${type}_${new Date().toISOString().split('T')[0]}.xlsx`);
      setStatus({ type: 'success', msg: 'ดาวน์โหลดข้อมูลสำเร็จ!' });
    } catch (err: any) {
      console.error(err);
      setStatus({ type: 'error', msg: err.message || 'เกิดข้อผิดพลาดในการดาวน์โหลดข้อมูล' });
    } finally {
      setDownloadOptions(null);
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
        // --- Props / Furniture mode ---
          if (selectedType === 'prop' || selectedType === 'furniture') {
            
            // 🌟 ท่าไม้ตาย: ลบช่องว่างทั้งหมดทิ้งก่อนเทียบหาคอลัมน์ (รองรับทั้งแบบมีและไม่มีเว้นวรรคใน Excel)
            const getVal = (searchKey: string) => {
              const cleanSearch = searchKey.replace(/\s+/g, '').toLowerCase();
              const actualKey = Object.keys(row).find(k => k.replace(/\s+/g, '').toLowerCase() === cleanSearch);
              return actualKey ? row[actualKey] : null;
            };

            const itemNo = getVal("Item NO")?.toString() || "";
            const sheetSku = getVal("SKU")?.toString() || `${selectedType === 'furniture' ? 'FUR' : 'PROP'}-${Date.now()}-${idx}`;
            const sheetBarcode = getVal("BARCODE")?.toString() || getVal("BARCOE")?.toString() || "";
            
            const w = getVal("W") != null ? Number(getVal("W")) : null;
            const d = getVal("D") != null ? Number(getVal("D")) : null;
            const h = getVal("H") != null ? Number(getVal("H")) : null;
            
            // จัดการตัวเลขที่อาจมีลูกน้ำ (,) ติดมา
            const rawCostTh = getVal("Cost TH") || 0;
            const costTh = Number(rawCostTh.toString().replace(/,/g, ''));
            
            const rawPrice = getVal("Price") || 0;
            const priceRounded = Number(rawPrice.toString().replace(/,/g, ''));

            // ดึงข้อมูลผ่าน getVal ไม่ว่า Excel จะเขียน CollectionGroup หรือ Collection Group ก็หาเจอชัวร์!
            const collectionGroupId = getVal("Collection Group")?.toString() || null;
            const productSupValue = getVal("Product Sup")?.toString() || null;
            const nameImageGroupValue = getVal("Name Group")?.toString() || getVal("NameGroup")?.toString() || getVal("Name Image Group")?.toString() || getVal("NameImageGroup")?.toString() || null;
            const imageGroupValue = getVal("Image Group")?.toString() || getVal("ImageGroup")?.toString() || null;
            const factoryName = getVal("Factory")?.toString() || null;
            const productName = getVal("Name Product")?.toString() || `${selectedType === 'furniture' ? 'Furniture' : 'Prop'} - ${sheetSku}`;

            return {
              name: productName, 
              sku: sheetSku,
              barcode: sheetBarcode,
              color: getVal("Color")?.toString() || null,
              category_id: selectedType === 'furniture' ? 'furniture' : 'prop',
              image_url: getVal("Link Picture")?.toString() || null,
              status: "active",
              cost: costTh,
              price: priceRounded,
              weight: 0,
              unit: "ชิ้น",
              description: getVal("Description")?.toString() || null,
              
              collection_group_id: collectionGroupId, 
              factory_name: itemNo, 
              _temp_product_sup: productSupValue, 
              _temp_name_image_group: nameImageGroupValue,
              _temp_image_group: imageGroupValue, 
              
              specs: {
                width_cm: w,
                length_cm: d,
                thickness_cm: h,
                brand: factoryName,
                group_size: getVal("Group Sisz")?.toString() || getVal("Group Size")?.toString() || null,
                material: getVal("Material")?.toString() || null,
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
        try {
          const { existing, error } = await checkExistingSkus(skusToCheck);
          if (error) throw new Error(`ตรวจสอบ SKU ในฐานข้อมูลไม่สำเร็จ: ${error}`);
          setExistingSkus(new Set(existing));
        } catch (skuErr) {
          console.warn("checkExistingSkus failed:", skuErr);
          throw skuErr;
        }

        // ---------------------------------------------------------
        // ✅ เช็คคอลัมน์กลุ่มสินค้า (Product Sup) 
        // ---------------------------------------------------------
        const uniqueGroupsMap = new Map<string, { id: string, product_sup: string, name?: string | null, cover_image_url?: string | null }>();
        uniqueData.forEach(item => {
          if (item.collection_group_id) {
            uniqueGroupsMap.set(item.collection_group_id, {
              id: item.collection_group_id,
              product_sup: item._temp_product_sup || 'ไม่มีชื่อหมวดหมู่',
              name: item._temp_name_image_group || null,
              cover_image_url: item._temp_image_group || null
            });
          }
        });
        
        // แปลง Map กลับเป็น Array
        const allExtractedGroups = Array.from(uniqueGroupsMap.values());

        if (allExtractedGroups.length > 0) {
          const groupIdsOnly = allExtractedGroups.map(g => g.id);
          try {
            const { existing: existingGroups, error } = await checkExistingGroups(groupIdsOnly);
            if (error) throw new Error(`ตรวจสอบ Collection Group ในฐานข้อมูลไม่สำเร็จ: ${error}`);

            // คัดกรองเอาเฉพาะ "กลุ่มใหม่" ที่ยังไม่มีในระบบ
            const newGroups = allExtractedGroups.filter(g => !existingGroups.includes(g.id));

            setNewGroupCount(newGroups.length);
            setExistingGroupIds(existingGroups);
            setNewGroupsPreview(newGroups); // เก็บเข้า State เพื่อไปโชว์
          } catch (groupErr) {
            console.warn("checkExistingGroups failed:", groupErr);
            throw groupErr;
          }
        } else {
          setNewGroupCount(0);
          setExistingGroupIds([]);
          setNewGroupsPreview([]);
        }
        // ---------------------------------------------------------

        setData(uniqueData)
      } catch (err: any) {
        console.error("handleFileUpload error:", err);
        setStatus({ type: 'error', msg: err?.message || 'อ่านไฟล์หรือเชื่อมต่อฐานข้อมูลไม่สำเร็จ โปรดตรวจสอบรูปแบบไฟล์และสิทธิ์เข้าถึง' })
      } finally {
        setLoading(false)
      }
    }
    reader.readAsBinaryString(file)
  }

  const handleSaveAll = async () => {
    if (data.length === 0) return
    setLoading(true)
    setStatus({ type: 'info', msg: 'กำลังบันทึกข้อมูลสินค้าลงฐานข้อมูล...' })
    
    // 1. บันทึกข้อมูลสินค้าลง Database ก่อนเสมอ (ให้มั่นใจว่าสินค้าไม่หายแน่นอน)
    const res = await bulkCreateProducts(data)

    if (res.error) {
      setLoading(false)
      setStatus({ type: 'error', msg: res.error })
      return
    }

    // 2. กวาด SKU ที่มีรูปภาพเพื่อสร้าง CLIP Vector ต่อทันที
    const importedSkusWithImages = data.filter(item => item.image_url).map(item => item.sku)
    
    if (importedSkusWithImages.length > 0) {
      setStatus({ 
        type: 'info', 
        msg: `บันทึกข้อมูลสินค้าแล้ว (${res.count} รายการ) ⚡ กำลังสร้าง Vector ค้นหาด้วยภาพ (${importedSkusWithImages.length} รายการ)...` 
      })
      
      try {
        // Load the optional AI feature only after the database import succeeds.
        // This keeps the normal import flow working in runtimes without ONNX.
        const { embedProductsBySkus } = await import('../actions/clip-embed')
        const embedRes = await embedProductsBySkus(importedSkusWithImages)
        
        if (embedRes.failed > 0) {
          setStatus({
            type: 'info',
            msg: `นำเข้าสำเร็จ ${res.count} รายการ | สร้าง Vector สำเร็จ ${embedRes.succeeded} รายการ (มี ${embedRes.failed} รายการที่รูปภาพมีปัญหา/โหลดไม่ได้ แต่สินค้าถูกบันทึกเรียบร้อย)`
          })
        } else {
          setStatus({
            type: 'success',
            msg: `นำเข้าและสร้าง Vector ค้นหาด้วยภาพสำเร็จครบสมบูรณ์ ${res.count} รายการ!`
          })
        }
      } catch (embedErr: any) {
        console.warn("Embed background fallback:", embedErr)
        // Fallback: สินค้าถูกบันทึกเรียบร้อยแล้ว ไม่ต้องบล็อก user
        setStatus({
          type: 'success',
          msg: `นำเข้าข้อมูลสินค้าสำเร็จ ${res.count} รายการ! (ระบบ Vector จะประมวลผลต่อให้อัตโนมัติ)`
        })
      }
    } else {
      setStatus({ type: 'success', msg: `นำเข้าและอัปเดตข้อมูลสำเร็จ ${res.count} รายการ!` })
    }

    setLoading(false)
    setData([])
    setExistingSkus(new Set())
    setExistingGroupIds([])
    setNewGroupsPreview([]) // เคลียร์ Preview หลังเซฟ
  }

  const handleClearData = () => {
    setData([]); 
    setStatus(null); 
    setExistingSkus(new Set()); 
    setExistingGroupIds([]); 
    setNewGroupsPreview([]); // เคลียร์ Preview
    setFilterMode('ALL');
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

          <button 
            type="button"
            onClick={fetchDataForDownload}
            disabled={downloading}
            className="px-4 py-2 text-sm font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4" />} 
            ดาวน์โหลดข้อมูลทั้งหมด
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
              <ImageIcon size={12} /> Props / Decor
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

          {/* Furniture */}
          <div className="border-t border-slate-200 pt-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
              <Armchair size={12} /> Furniture
            </p>
            <button
              type="button"
              onClick={() => handleSelectType('furniture')}
              className={`px-3 py-2 rounded-lg border-2 text-sm font-semibold transition-all
                ${selectedType === 'furniture' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-600'}`}
            >
              Furniture (เฟอร์นิเจอร์)
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
                  <Tag size={16} /> จะสร้างหมวดหมู่ใหม่: {newGroupCount} หมวดหมู่
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
                <Sparkles size={16} /> สร้างใหม่: {newItemsCount} รายการ
              </button>

              {/* ปุ่มดูเฉพาะอัปเดต */}
              <button 
                onClick={() => setFilterMode('UPDATE')}
                className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all 
                  ${filterMode === 'UPDATE' ? 'bg-blue-500 text-white shadow-md ring-2 ring-blue-300 ring-offset-1' : 'bg-blue-100 text-blue-800 hover:bg-blue-200 opacity-80'}`}
              >
                <RefreshCw size={16} /> อัปเดตของเดิม: {updatedItemsCount} รายการ
              </button>
            </div>
            <button onClick={handleClearData} className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2 transition mt-3 sm:mt-0">
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
                  <span key={id} className="px-2 py-0.5 bg-amber-200/60 text-amber-900 border border-amber-300/80 rounded flex items-center gap-1 text-[11px] font-bold shadow-sm">
                    <Folder size={12} /> {id}
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

          {/* ✅ กล่อง UI โชว์ Preview กลุ่มใหม่ที่จะสร้าง */}
          {newGroupsPreview.length > 0 && (
            <div className="w-full mt-3 px-4 py-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-800 text-sm shadow-sm animate-in fade-in duration-300">
              <p className="font-bold flex items-center gap-2 text-purple-700">
                <Sparkles size={18} /> ระบบจะสร้างหมวดหมู่ใหม่ทั้งหมด {newGroupsPreview.length} รายการ
              </p>
              
              {/* ตาราง/กล่อง เล็กๆ เอาไว้โชว์รายการ */}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {newGroupsPreview.map((g) => (
                  <div key={g.id} className="bg-white p-2 rounded-lg border border-purple-100 shadow-sm flex items-center gap-2">
                    {g.cover_image_url && (
                      <img src={g.cover_image_url} alt="" className="w-9 h-9 object-cover rounded-md border border-slate-100 flex-shrink-0" />
                    )}
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ID: <span className="text-purple-600">{g.id}</span></span>
                      {g.name && <span className="text-xs font-bold text-slate-800 truncate" title={g.name}>{g.name}</span>}
                      <span className="text-[11px] text-slate-500 truncate" title={g.product_sup}>{g.product_sup}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="overflow-x-auto border rounded-xl max-h-[500px] overflow-y-auto mt-4">
            <table className="w-full text-left text-sm border-collapse relative">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="p-3 border-b text-center">Status</th> 
                  <th className="p-3 border-b">SKU</th>
                  {(selectedType === 'prop' || selectedType === 'furniture') ? (
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
                          {isUpdate ? 'Update' : 'New'}
                        </span>
                      </td>
                      
                      <td className="p-3 font-mono text-xs font-bold text-slate-800">{item.sku}</td>
                      
                      {(selectedType === 'prop' || selectedType === 'furniture') ? (
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

      {/* Download Options Modal */}
      {downloadOptions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                  <DownloadCloud size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">เลือกข้อมูลที่ต้องการดาวน์โหลด</h3>
                  <p className="text-sm text-slate-500">พบข้อมูลในระบบทั้งหมด {downloadOptions.slabs.length + downloadOptions.rough.length + downloadOptions.props.length + downloadOptions.furniture.length} รายการ</p>
                </div>
              </div>
              
              <div className="space-y-3 mt-6">
                <button 
                  onClick={() => confirmDownload('slabs')}
                  disabled={downloadOptions.slabs.length === 0}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <div className="flex items-center gap-3">
                    <Layers className="text-slate-400 group-hover:text-blue-500 transition" size={20} />
                    <span className="font-bold text-slate-700 group-hover:text-blue-700 text-left">Wood Slabs (ไม้แผ่น)</span>
                  </div>
                  <span className="bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-700 py-1 px-3 rounded-full text-xs font-bold transition">
                    {downloadOptions.slabs.length} รายการ
                  </span>
                </button>

                <button 
                  onClick={() => confirmDownload('rough')}
                  disabled={downloadOptions.rough.length === 0}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-orange-300 hover:bg-orange-50 transition disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <div className="flex items-center gap-3">
                    <Hammer className="text-slate-400 group-hover:text-orange-500 transition" size={20} />
                    <span className="font-bold text-slate-700 group-hover:text-orange-700 text-left">Rough Wood (ไม้ดิบ)</span>
                  </div>
                  <span className="bg-slate-100 text-slate-600 group-hover:bg-orange-100 group-hover:text-orange-700 py-1 px-3 rounded-full text-xs font-bold transition">
                    {downloadOptions.rough.length} รายการ
                  </span>
                </button>
                
                <button 
                  onClick={() => confirmDownload('props')}
                  disabled={downloadOptions.props.length === 0}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50 transition disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <div className="flex items-center gap-3">
                    <ImageIcon className="text-slate-400 group-hover:text-purple-500 transition" size={20} />
                    <span className="font-bold text-slate-700 group-hover:text-purple-700 text-left">Props / Decor (ของตกแต่ง)</span>
                  </div>
                  <span className="bg-slate-100 text-slate-600 group-hover:bg-purple-100 group-hover:text-purple-700 py-1 px-3 rounded-full text-xs font-bold transition">
                    {downloadOptions.props.length} รายการ
                  </span>
                </button>

                <button 
                  onClick={() => confirmDownload('furniture')}
                  disabled={downloadOptions.furniture.length === 0}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <div className="flex items-center gap-3">
                    <Armchair className="text-slate-400 group-hover:text-emerald-500 transition" size={20} />
                    <span className="font-bold text-slate-700 group-hover:text-emerald-700 text-left">Furniture (เฟอร์นิเจอร์)</span>
                  </div>
                  <span className="bg-slate-100 text-slate-600 group-hover:bg-emerald-100 group-hover:text-emerald-700 py-1 px-3 rounded-full text-xs font-bold transition">
                    {downloadOptions.furniture.length} รายการ
                  </span>
                </button>

                <button 
                  onClick={() => confirmDownload('all')}
                  className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition shadow-md shadow-slate-200 mt-4"
                >
                  <TableIcon size={18} /> ดาวน์โหลดทั้งหมด (แยก 4 Sheet)
                </button>
              </div>
            </div>
            
            <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setDownloadOptions(null)}
                className="px-5 py-2 font-bold text-slate-500 hover:bg-slate-200 rounded-lg transition"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
