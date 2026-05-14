'use client';

import React, { useState } from 'react';
import { Loader2, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { getProductsForCheck } from './actions';

type ScannedItem = {
  code: string;
  qty: number;
};

type ProcessedResult = {
  scannedCode: string;
  sku: string;
  barcode: string;
  name: string;
  scannedQty: number;
  stockQty: number;
  rfidCount: number;
  status: 'MATCH' | 'DISCREPANCY' | 'NOT_FOUND_IN_DB';
};

export default function CheckRfidPage() {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [results, setResults] = useState<ProcessedResult[]>([]);
  const [missingItems, setMissingItems] = useState<ProcessedResult[]>([]);
  const [hasProcessed, setHasProcessed] = useState(false);

  const branchId = 1;

  const handleProcess = async () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);
    setHasProcessed(false);

    try {
      const lines = inputText.trim().split('\n');
      const scannedItems: ScannedItem[] = [];
      const scannedCodes: string[] = [];

      lines.forEach((line) => {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
          const qty = parseInt(parts[0], 10);
          const code = parts[1];
          if (!isNaN(qty) && code) {
            scannedItems.push({ code, qty });
            scannedCodes.push(code);
          }
        }
      });

      const { scannedData, missingData } = await getProductsForCheck(scannedCodes);

      const processedResults: ProcessedResult[] = [];
      const notScannedButInSystem: ProcessedResult[] = [];

      // เช็คข้อมูลรายการที่สแกน
      scannedItems.forEach(item => {
        const productInfo = scannedData?.find((p: any) => p.sku === item.code || p.barcode === item.code);
        
        if (productInfo) {
          const stockQty = productInfo.stock?.find((s: any) => s.branch_id === branchId)?.qty || 0;
          // เช็คเฉพาะ Tag ที่สถานะ IN_STOCK
          const rfidCount = productInfo.product_rfid_tags?.filter((t: any) => t.branch_id === branchId && t.status === 'IN_STOCK').length || 0;
          
          const isMatch = item.qty === Number(stockQty) && item.qty === Number(rfidCount);
          
          processedResults.push({
            scannedCode: item.code,
            sku: productInfo.sku || '-',
            barcode: productInfo.barcode || '-',
            name: productInfo.name,
            scannedQty: item.qty,
            stockQty: Number(stockQty),
            rfidCount: Number(rfidCount),
            status: isMatch ? 'MATCH' : 'DISCREPANCY'
          });
        } else {
          processedResults.push({
            scannedCode: item.code,
            sku: '-',
            barcode: '-',
            name: 'ไม่พบในระบบ',
            scannedQty: item.qty,
            stockQty: 0,
            rfidCount: 0,
            status: 'NOT_FOUND_IN_DB'
          });
        }
      });

      // เช็คข้อมูลของตกหล่น
      missingData?.forEach((info: any) => {
        const stockQty = info.stock?.find((s: any) => s.branch_id === branchId)?.qty || 0;
        // เช็คเฉพาะ Tag ที่สถานะ IN_STOCK
        const rfidCount = info.product_rfid_tags?.filter((t: any) => t.branch_id === branchId && t.status === 'IN_STOCK').length || 0;

        if (Number(stockQty) > 0 || Number(rfidCount) > 0) {
          notScannedButInSystem.push({
            scannedCode: '-',
            sku: info.sku || '-',
            barcode: info.barcode || '-',
            name: info.name,
            scannedQty: 0,
            stockQty: Number(stockQty),
            rfidCount: Number(rfidCount),
            status: 'DISCREPANCY'
          });
        }
      });

      setResults(processedResults);
      setMissingItems(notScannedButInSystem);
      setHasProcessed(true);

    } catch (error) {
      console.error("Error processing data:", error);
      alert("เกิดข้อผิดพลาดในการดึงข้อมูลครับนาย ลองตรวจสอบข้อมูลอีกครั้งครับ");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h1 className="text-xl font-bold flex items-center gap-2 mb-2">
          📋 นำเข้าจำนวนเพื่อตรวจสอบ (Audit RFID & Stock)
        </h1>
        <p className="text-gray-500 mb-4">
          Copy ข้อมูล 2 คอลัมน์ (คอลัมน์ซ้าย: จำนวน, คอลัมน์ขวา: รหัสสินค้า SKU หรือ Barcode) แล้ว Paste ลงในช่องด้านล่างได้เลยครับ
        </p>

        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="2 FD-D24031A&#10;2 8851234567890&#10;1 FB-E24015A"
          className="w-full h-48 p-4 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-green-500 outline-none resize-y"
        />

        <div className="flex justify-end gap-3 mt-4">
          <button 
            onClick={() => { setInputText(''); setHasProcessed(false); }}
            className="px-6 py-2 border rounded-lg hover:bg-gray-50 font-medium"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleProcess}
            disabled={isProcessing || !inputText}
            className="px-6 py-2 bg-[#10b981] hover:bg-[#059669] text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
          >
            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : '🚀 ประมวลผลและตรวจสอบ'}
          </button>
        </div>
      </div>

      {hasProcessed && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="bg-blue-50 px-6 py-4 border-b">
              <h2 className="text-lg font-bold text-blue-800">📊 ผลการตรวจสอบรายการที่ค้นหา</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3">รหัสที่ค้นหา</th>
                    <th className="px-6 py-3">SKU</th>
                    <th className="px-6 py-3">Barcode</th>
                    <th className="px-6 py-3">ชื่อสินค้า</th>
                    <th className="px-6 py-3 text-center">จำนวน (Input)</th>
                    <th className="px-6 py-3 text-center">Stock</th>
                    <th className="px-6 py-3 text-center">Tag RFID</th>
                    <th className="px-6 py-3">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {results.map((row, idx) => (
                    <tr key={idx} className={row.status !== 'MATCH' ? 'bg-red-50/50' : 'hover:bg-gray-50'}>
                      <td className="px-6 py-4 font-mono text-gray-500">{row.scannedCode}</td>
                      <td className="px-6 py-4 font-medium">{row.sku}</td>
                      <td className="px-6 py-4">{row.barcode}</td>
                      <td className="px-6 py-4">{row.name}</td>
                      <td className="px-6 py-4 text-center font-bold text-blue-600">{row.scannedQty}</td>
                      <td className={`px-6 py-4 text-center font-bold ${row.stockQty !== row.scannedQty ? 'text-red-500' : 'text-green-600'}`}>
                        {row.stockQty}
                      </td>
                      <td className={`px-6 py-4 text-center font-bold ${row.rfidCount !== row.scannedQty ? 'text-red-500' : 'text-green-600'}`}>
                        {row.rfidCount}
                      </td>
                      <td className="px-6 py-4">
                        {row.status === 'MATCH' && <span className="inline-flex items-center gap-1 text-green-600 bg-green-100 px-2 py-1 rounded-md text-xs font-bold"><CheckCircle2 className="w-4 h-4"/> ตรงกัน</span>}
                        {row.status === 'DISCREPANCY' && <span className="inline-flex items-center gap-1 text-red-600 bg-red-100 px-2 py-1 rounded-md text-xs font-bold"><AlertCircle className="w-4 h-4"/> ไม่ตรงกัน</span>}
                        {row.status === 'NOT_FOUND_IN_DB' && <span className="inline-flex items-center gap-1 text-gray-600 bg-gray-200 px-2 py-1 rounded-md text-xs font-bold"><XCircle className="w-4 h-4"/> ไม่มีในระบบ</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border overflow-hidden border-orange-200">
            <div className="bg-orange-50 px-6 py-4 border-b border-orange-200">
              <h2 className="text-lg font-bold text-orange-800 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" /> 
                สินค้าที่มีในระบบ แต่ไม่ได้ถูกค้นหา (ตกหล่น)
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3">SKU</th>
                    <th className="px-6 py-3">Barcode</th>
                    <th className="px-6 py-3">ชื่อสินค้า</th>
                    <th className="px-6 py-3 text-center text-orange-600">Stock ค้าง</th>
                    <th className="px-6 py-3 text-center text-orange-600">RFID ค้าง</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {missingItems.map((row, idx) => (
                    <tr key={idx} className="hover:bg-orange-50/50">
                      <td className="px-6 py-4 font-medium">{row.sku}</td>
                      <td className="px-6 py-4">{row.barcode}</td>
                      <td className="px-6 py-4">{row.name}</td>
                      <td className="px-6 py-4 text-center font-bold text-orange-600">{row.stockQty}</td>
                      <td className="px-6 py-4 text-center font-bold text-orange-600">{row.rfidCount}</td>
                    </tr>
                  ))}
                  {missingItems.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-green-600 font-medium flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-5 h-5" /> สแกนครบทุกรายการ ไม่มีสินค้าตกหล่น!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}