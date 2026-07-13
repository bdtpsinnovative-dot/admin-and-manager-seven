"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import { updatePropImageUrl } from "@/actions/props";
import PropBoxCalculator from "./PropBoxCalculator";
import { 
  Search, X, Check, Edit, Printer, FileDown, FileUp, 
  Package, Image as ImageIcon, Loader2, Plus, Trash2, Save 
} from "lucide-react";

function BarcodeSvg({ value }: { value: string }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (ref.current && value) {
      try {
        JsBarcode(ref.current, value, {
          format: "CODE128",
          width: 1.4,
          height: 32,
          displayValue: true,
          fontSize: 9,
          margin: 2,
          textMargin: 1,
        });
      } catch {}
    }
  }, [value]);
  return <svg ref={ref} className="w-full" />;
}

interface Props { products: any[] }

export default function PropsClient({ products }: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [printTargets, setPrintTargets] = useState<any[]>([]);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Image edit
  const [editImageItem, setEditImageItem] = useState<any | null>(null);
  const [editImageUrl, setEditImageUrl] = useState("");
  const [localImages, setLocalImages] = useState<Record<number, string>>({});
  const [isPending, startTransition] = useTransition();
  const [imageError, setImageError] = useState("");

  const filteredProducts = searchQuery.trim()
    ? products.filter(p => {
        const q = searchQuery.toLowerCase();
        return (
          (p.name || "").toLowerCase().includes(q) ||
          (p.sku || "").toLowerCase().includes(q) ||
          (p.barcode || "").toLowerCase().includes(q) ||
          (p.color || "").toLowerCase().includes(q) ||
          (p.item_no || "").toLowerCase().includes(q)
        );
      })
    : products;

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () =>
    setSelected(selected.size === filteredProducts.length ? new Set() : new Set(filteredProducts.map(p => p.id)));

  const openEditImage = (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    setEditImageItem(item);
    setEditImageUrl(localImages[item.id] ?? item.image_url ?? "");
    setImageError("");
  };

  const saveImage = () => {
    if (!editImageItem) return;
    const url = editImageUrl.trim();
    startTransition(async () => {
      try {
        await updatePropImageUrl(editImageItem.id, url);
        setLocalImages(prev => ({ ...prev, [editImageItem.id]: url }));
        setEditImageItem(null);
      } catch {
        setImageError("บันทึกไม่สำเร็จ กรุณาลองใหม่");
      }
    });
  };

  const openModal = (targets: any[]) => {
    const q: Record<number, number> = {};
    targets.forEach(p => { q[p.id] = 1; });
    setQuantities(q);
    setPrintTargets(targets);
    setShowModal(true);
  };

  const totalSets = printTargets.reduce((s, p) => s + (quantities[p.id] || 1), 0);

  // ฟังก์ชันจัดการข้อมูลที่ Paste มาจาก Google Sheets
  const handleImport = () => {
    const lines = importText.split('\n');
    const newQuantities: Record<number, number> = {};
    const targets: any[] = [];
    const notFound: string[] = [];

    lines.forEach(line => {
      if (!line.trim()) return;
      const parts = line.split('\t');
      if (parts.length >= 2) {
        const qty = parseInt(parts[0].trim());
        const skuOrCode = parts[1].trim();

        if (!isNaN(qty) && qty > 0) {
          const product = products.find(p => 
            p.sku === skuOrCode || 
            p.barcode === skuOrCode || 
            p.item_no === skuOrCode
          );

          if (product) {
            newQuantities[product.id] = qty;
            targets.push(product);
          } else {
            notFound.push(skuOrCode);
          }
        }
      }
    });

    if (targets.length > 0) {
      setQuantities(newQuantities);
      setPrintTargets(targets);
      setSelected(new Set(targets.map(p => p.id)));
      
      setShowImportModal(false);
      setImportText("");
      setShowModal(true);

      if (notFound.length > 0) {
        alert(`ดึงข้อมูลสำเร็จ ${targets.length} รายการ\nแต่ไม่พบรหัสเหล่านี้ในระบบ:\n${notFound.join(', ')}`);
      }
    } else {
      alert("ไม่พบข้อมูลที่ตรงกับในระบบเลยครับนาย กรุณาตรวจสอบว่า Copy มาถูกคอลัมน์ไหม (จำนวน [Tab] รหัสสินค้า)");
    }
  };

  const printQrPhoto = async () => {
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    const groups: string[] = [];

    for (const p of printTargets) {
      const sets = quantities[p.id] || 1;
      const codeValue = p.sku || p.barcode || '';
      const collectionId = p.collection_group_id || 'all';
      const val = codeValue.startsWith('http') 
        ? codeValue 
        : `https://www.terrahome-studio.com/prop/${collectionId}/${encodeURIComponent(codeValue)}`;
      
      let qrImg = '';
      try { 
        qrImg = await QRCode.toDataURL(val, { width: 200, margin: 1, errorCorrectionLevel: 'M' }); 
      } catch {}

      const specs = p.specs || {};
      const L = p.length_cm ?? specs.length_cm ?? '';
      const W = p.width_cm ?? specs.width_cm ?? '';
      const T = p.thickness_cm ?? specs.thickness_cm ?? '';
      
      const sizeStr = (L || W || T) ? `${L}×${W}×${T} CM` : (specs.size || '');
      const colorStr = p.color || '';
      const materialStr = p.material || specs.material || '';
      const priceVal = Number(p.price);
      const priceStr = priceVal > 0 ? new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(priceVal) : '';

      for (let i = 0; i < sets; i++) {
        groups.push(`
          <div class="group">
            <div class="hole"></div>
            <div class="logo-sec">
              <img src="/logo.terra.home.png" alt="Logo" class="logo-img" />
            </div>
            
            <div class="top-sec">
              <div class="photo-cell">
                <img src="${p.image_url || ''}" onerror="this.style.display='none'" />
              </div>
              <div class="qr-cell">
                <img src="${qrImg}" />
              </div>
            </div>
            
            <div class="info-sec">
              <div class="pname" title="${p.name || ''}">${p.name || ''}</div>
              <div class="details-list">
                <div class="detail-row">
                  <span class="detail-label">SKU</span>
                  <span class="detail-val" title="${p.sku || ''}">${p.sku || '—'}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">COLOR</span>
                  <span class="detail-val" title="${colorStr}">${colorStr || '—'}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">SIZE</span>
                  <span class="detail-val" title="${sizeStr}">${sizeStr || '—'}</span>
                </div>
                ${materialStr ? `
                <div class="detail-row">
                  <span class="detail-label">MAT.</span>
                  <span class="detail-val" title="${materialStr}">${materialStr}</span>
                </div>` : ''}
              </div>
              ${priceStr ? `<div class="price-tag">${priceStr}</div>` : ''}
            </div>
          </div>`);
      }
    }
    const pages: string[] = [];
    for (let i = 0; i < groups.length; i += 12) {
      const chunk = groups.slice(i, i + 12);
      pages.push(`<div class="page"><div class="grid">${chunk.join("")}</div></div>`);
    }
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title></title>
    <style>
      @page{size:A4;margin:8mm}
      *{margin:0;padding:0;box-sizing:border-box}
      body{margin:0;padding:0;font-family:sans-serif;}
      .page{width:calc(210mm - 16mm);height:calc(297mm - 16mm);overflow:hidden;page-break-after:always}
      .page:last-child{page-break-after:auto}
      
      .grid{display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(3,75mm);gap:0; border-top:1px solid #bbb; border-left:1px solid #bbb;}
      
      .group { 
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        border-right: 1px solid #bbb; 
        border-bottom: 1px solid #bbb; 
        background: #fff; 
        padding: 2mm 3mm 3mm 3mm;
        height: 100%;
        overflow: hidden;
        position: relative;
      }
      
      .hole {
        width: 1.8mm;
        height: 1.8mm;
        border: none;
        background: transparent;
        margin: 3.5mm auto 1.5mm auto;
        flex-shrink: 0;
        background: #fff;
      }
      
      .logo-sec {
        text-align: center;
        margin-bottom: 1.5mm;
        flex-shrink: 0;
        display: flex;
        justify-content: center;
        align-items: center;
      }
      
      .logo-img {
        height: 4.5mm;
        object-fit: contain;
      }
      
      .top-sec {
        display: flex;
        height: 26mm;
        min-height: 0;
        margin-bottom: 1.5mm;
        border-bottom: 1px solid #eee;
        gap: 2mm;
        padding-bottom: 1.5mm;
      }
      
      .photo-cell {
        flex: 1.3;
        height: 100%;
        background: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }
      
      .photo-cell img {
        max-width: 22mm;
        max-height: 22mm;
        object-fit: contain;
        display: block;
      }
      
      .qr-cell {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        overflow: hidden;
      }
      
      .qr-cell img {
        width: 100%;
        max-width: 17mm;
        max-height: 17mm;
        object-fit: contain;
      }
      
      .info-sec {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        min-height: 0;
      }
      
      .pname {
        font-size: 7.5pt;
        font-weight: 800;
        color: #000;
        line-height: 1.25;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-bottom: 1.5mm;
        text-align: left;
      }
      
      .details-list {
        display: flex;
        flex-direction: column;
        gap: 0.8mm;
      }
      
      .detail-row {
        display: flex;
        align-items: center;
        font-size: 6.5pt;
        line-height: 1.2;
      }
      
      .detail-label {
        color: #555;
        font-weight: 800;
        width: 10mm;
        flex-shrink: 0;
      }
      
      .detail-val {
        color: #000;
        font-weight: 800;
        white-space: normal;
        word-break: break-all;
      }
      
      .price-tag {
        font-size: 10.5pt;
        font-weight: 900;
        color: #000;
        border-top: 1px dashed #ccc;
        padding-top: 1.5mm;
        margin-top: auto;
        text-align: right;
      }
      
      .price-container {
        border-top: 1px dashed #ccc;
        padding-top: 1.5mm;
        margin-top: auto;
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
      }
      
      .discount-badge {
        font-size: 6.5pt;
        font-weight: 850;
        color: #fff;
        background: #e11d48;
        padding: 0.5mm 1.2mm;
        border-radius: 0.6mm;
        line-height: 1;
        margin-bottom: 0.5mm;
      }
      
      .price-box {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        line-height: 1.1;
      }
      
      .original-price {
        font-size: 7.5pt;
        color: #888;
        text-decoration: line-through;
        font-weight: 700;
        margin-bottom: 0.5mm;
      }
      
      .discounted-price {
        font-size: 11.5pt;
        font-weight: 950;
        color: #e11d48;
      }
    </style></head><body>
    ${pages.join("")}
    <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}<\/script>
    </body></html>`);
    win.document.close();
  };

  const allSelected = filteredProducts.length > 0 && filteredProducts.every(p => selected.has(p.id));
  const selectedProducts = products.filter(p => selected.has(p.id));

  return (
    <>
      <div className="p-4 md:p-6 bg-slate-50 min-h-screen font-sans text-slate-800">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-6 h-6 text-indigo-600" />
              <span>Props Inventory</span>
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">จัดการรายการสินค้าประกอบฉากทั้งหมด {products.length} รายการ</p>
          </div>
          <Link href="/props-new/upload" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-semibold text-sm transition">
            + Add New Prop
          </Link>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อ, SKU, บาร์โค้ด, สี..."
              className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded outline-none focus:border-indigo-500 bg-white"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-xs text-slate-400 mt-1 ml-1">พบ {filteredProducts.length} รายการ จาก {products.length} ทั้งหมด</p>
          )}
        </div>

        <PropBoxCalculator
          products={products}
          filteredProducts={filteredProducts}
          selectedProducts={selectedProducts}
        />

        {/* Action Bar */}
        <div className="flex items-center gap-2 mb-6 bg-white p-3 rounded border border-slate-200 flex-wrap">
          <button onClick={toggleAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">
            <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${allSelected ? 'bg-slate-800 border-slate-800' : 'border-slate-300 bg-white'}`}>
              {allSelected && <Check className="text-white w-2.5 h-2.5" />}
            </span>
            <span>{allSelected ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}</span>
          </button>

          <button onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded border border-green-200 bg-green-50/50 text-green-600 text-xs font-semibold hover:bg-green-50 transition">
            <FileUp className="w-3.5 h-3.5" />
            <span>นำเข้าจาก Sheets</span>
          </button>

          {selected.size > 0 && (
            <button onClick={() => openModal(selectedProducts)}
              className="flex items-center gap-1 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition">
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์ที่เลือก ({selected.size})</span>
            </button>
          )}
          <button onClick={() => openModal(products)}
            className="flex items-center gap-1 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition">
            <Printer className="w-3.5 h-3.5" />
            <span>พิมพ์ทั้งหมด</span>
          </button>
          {selected.size > 0 && <span className="ml-auto text-xs text-slate-500">เลือก {selected.size} รายการ</span>}
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {filteredProducts.length === 0 && (
            <div className="col-span-full text-center py-16 border border-slate-200 border-dashed rounded bg-white text-slate-400">
              <p className="font-semibold">ไม่พบสินค้าที่ตรงกับ &quot;{searchQuery}&quot;</p>
            </div>
          )}
          {filteredProducts.map((item) => {
            const specs = item.specs || {};
            const L = item.length_cm ?? specs.length_cm ?? '';
            const W = item.width_cm ?? specs.width_cm ?? '';
            const T = item.thickness_cm ?? specs.thickness_cm ?? '';
            const sizeStr = (L || W || T) ? `${L}×${W}×${T}` : (specs.size || '');
            const displayImage = localImages[item.id] ?? item.image_url;
            return (
              <div key={item.id} onClick={() => toggleSelect(item.id)}
                className={`bg-white rounded border hover:shadow transition overflow-hidden cursor-pointer relative
                  ${selected.has(item.id) ? 'border-blue-500 bg-blue-50/10' : 'border-slate-200 hover:border-slate-300'}`}>

                <div className="relative aspect-square bg-slate-50 m-1.5 rounded border border-slate-100 overflow-hidden">
                  <div className={`absolute top-1.5 left-1.5 z-10 w-4 h-4 rounded border flex items-center justify-center
                    ${selected.has(item.id) ? 'bg-blue-500 border-blue-500' : 'bg-white border-slate-300'}`}>
                    {selected.has(item.id) && <Check className="text-white w-3 h-3" />}
                  </div>
                  <button onClick={(e) => openEditImage(e, item)}
                    title="เปลี่ยนรูปภาพ"
                    className="absolute top-1.5 right-1.5 z-10 w-6 h-6 rounded bg-white/90 hover:bg-white border border-slate-200 flex items-center justify-center shadow-sm transition active:scale-95">
                    <Edit className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                  <img src={displayImage || "/placeholder.png"} alt={item.name}
                    className="object-contain w-full h-full p-1.5" />
                </div>

                <div className="px-2.5 pb-3 pt-1">
                  <div className="flex items-center gap-1 mb-1.5 flex-wrap">
                    <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase">{item.color || '–'}</span>
                    {sizeStr && (
                      <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold">{sizeStr}</span>
                    )}
                  </div>
                  <h3 className="text-xs font-bold text-slate-800 mb-2 line-clamp-1">{item.name}</h3>

                  <div className="bg-slate-50 rounded p-1 border border-slate-100">
                    {item.barcode
                      ? <BarcodeSvg value={item.barcode} />
                      : <p className="text-center text-[10px] text-slate-400 py-2">ไม่มีบาร์โค้ด</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Print Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded border border-slate-200 w-full max-w-2xl max-h-[80vh] flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-base font-bold text-slate-800">เลือกจำนวนที่ต้องการพิมพ์</h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  รวม <b>{totalSets} ชุด</b> | 1 ชุด = รูป + QR x 2 + ข้อมูล
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded text-slate-400 transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-2 bg-slate-50">
              {printTargets.map(p => {
                const specs = p.specs || {};
                const L = p.length_cm ?? specs.length_cm ?? '';
                const W = p.width_cm ?? specs.width_cm ?? '';
                const T = p.thickness_cm ?? specs.thickness_cm ?? '';
                const sizeStr = (L || W || T) ? `${L}×${W}×${T} CM` : (specs.size || '');
                return (
                  <div key={p.id} className="flex items-center gap-3 bg-white rounded border border-slate-200 p-2.5">
                    <img src={p.image_url || "/placeholder.png"} alt={p.name}
                      className="w-10 h-10 object-contain rounded bg-slate-50 border shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{p.name}</p>
                      <p className="text-xs font-mono text-slate-400 truncate">{p.barcode || p.sku}</p>
                      {sizeStr && <p className="text-xs text-blue-600 font-semibold">{sizeStr}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs text-slate-500">ชุด:</span>
                      <button onClick={() => setQuantities(q => ({ ...q, [p.id]: Math.max(1, (q[p.id] || 1) - 1) }))}
                        className="w-7 h-7 rounded bg-slate-100 font-bold text-slate-600 hover:bg-slate-200 transition text-sm">−</button>
                      <input type="number" min={1} value={quantities[p.id] || 1}
                        onChange={e => setQuantities(q => ({ ...q, [p.id]: Math.max(1, parseInt(e.target.value) || 1) }))}
                        className="w-11 text-center border border-slate-200 rounded text-xs font-bold py-1 bg-white" />
                      <button onClick={() => setQuantities(q => ({ ...q, [p.id]: (q[p.id] || 1) + 1 }))}
                        className="w-7 h-7 rounded bg-slate-100 font-bold text-slate-600 hover:bg-slate-200 transition text-sm">+</button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-slate-200 flex flex-col gap-2 bg-white">
              <button onClick={printQrPhoto}
                className="flex flex-col items-center gap-1 py-4 rounded border border-orange-200 bg-orange-50 hover:bg-orange-100 transition text-slate-700 text-sm">
                <span className="font-bold text-sm">พิมพ์ QR + รูป + ข้อมูล</span>
                <span className="text-[11px] text-slate-400">รูปซ้าย · QR ขวา 2 อัน · ข้อมูลด้านล่าง</span>
              </button>
              <button onClick={() => setShowModal(false)}
                className="w-full py-2 rounded border border-slate-200 font-semibold text-slate-500 hover:bg-slate-50 transition text-sm">
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Edit Modal */}
      {editImageItem && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditImageItem(null)}>
          <div className="bg-white rounded border border-slate-200 w-full max-w-sm flex flex-col gap-4 p-5 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-bold text-slate-800">เปลี่ยนรูปภาพ</h2>
            <p className="text-xs text-slate-400 -mt-2 truncate">{editImageItem.name}</p>

            {/* Preview */}
            <div className="bg-slate-50 rounded border border-slate-100 aspect-square flex items-center justify-center overflow-hidden">
              {editImageUrl ? (
                <img src={editImageUrl} alt="preview" className="object-contain w-full h-full p-2"
                  onError={e => (e.currentTarget.style.opacity = "0.3")} />
              ) : (
                <ImageIcon className="w-10 h-10 text-slate-300" />
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">URL รูปภาพ</label>
              <input
                type="url"
                value={editImageUrl}
                onChange={e => { setEditImageUrl(e.target.value); setImageError(""); }}
                placeholder="https://example.com/image.jpg"
                className="w-full border border-slate-200 rounded px-3 py-2 text-sm outline-none focus:border-indigo-500"
                autoFocus
              />
              {imageError && <p className="text-red-500 text-xs mt-1">{imageError}</p>}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setEditImageItem(null)}
                className="flex-1 py-2 rounded border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition">
                ยกเลิก
              </button>
              <button onClick={saveImage} disabled={isPending}
                className="flex-1 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-1.5">
                {isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>บันทึก...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>บันทึก</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowImportModal(false)}>
          <div className="bg-white rounded border border-slate-200 w-full max-w-2xl flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold text-slate-800">นำเข้าจำนวนจาก Google Sheets / Excel</h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  คัดลอกข้อมูล 2 คอลัมน์ (จำนวน [Tab] รหัสสินค้า) แล้ววางในช่องด้านล่าง
                </p>
              </div>
              <button onClick={() => setShowImportModal(false)} className="p-1 hover:bg-slate-100 rounded text-slate-400 transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={"2\tFD-D24031A\n2\tFD-D24031B\n1\tFB-E24015A"}
                className="w-full h-56 p-3 border border-slate-200 rounded focus:border-indigo-500 outline-none font-mono text-xs resize-none"
              />
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end gap-2 bg-slate-50">
              <button onClick={() => setShowImportModal(false)}
                className="px-4 py-2 rounded border border-slate-200 font-semibold text-slate-600 hover:bg-white transition text-xs">
                ยกเลิก
              </button>
              <button onClick={handleImport}
                className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white font-semibold transition text-xs shadow-sm">
                ประมวลผลและเตรียมพิมพ์
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
