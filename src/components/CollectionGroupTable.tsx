"use client";

import { useState, useEffect } from "react";
import { Trash2, FolderOpen, AlertCircle, RefreshCw } from "lucide-react";
import { getCollectionGroupsWithCounts, deleteCollectionGroup } from "../actions/woodslab";

export default function CollectionGroupTable({ tag }: { tag: 'furniture' | 'prop' }) {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getCollectionGroupsWithCounts(tag);
      if (res.error) {
        alert(res.error);
      } else {
        setGroups(res.data || []);
      }
    } catch (err: any) {
      alert("เกิดข้อผิดพลาดในการโหลดข้อมูล: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tag]);

  const handleDelete = async (groupId: string, itemCount: number) => {
    const confirmMsg = `คุณแน่ใจหรือไม่ที่จะลบกลุ่มสินค้า "${groupId}"?\n\n⚠️ คำเตือน: การลบกลุ่มนี้จะทำการลบสินค้าที่อยู่ภายในกลุ่มจำนวน ${itemCount} ชิ้นออกไปด้วยทั้งหมดโดยถาวร! (แต่จะไม่แตะต้องข้อมูลสต็อก หากสินค้าชิ้นไหนมีข้อมูลสต็อกอยู่ ระบบจะแจ้งเตือนและยกเลิกการลบ)`;
    if (!confirm(confirmMsg)) return;

    setDeletingId(groupId);
    try {
      const res = await deleteCollectionGroup(groupId);
      if (res.error) {
        alert(`เกิดข้อผิดพลาด: ${res.error}`);
      } else {
        alert(`ลบกลุ่มสินค้า ${groupId} เรียบร้อยแล้วครับนาย`);
        await loadData();
      }
    } catch (err: any) {
      alert(`ผิดพลาด: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3 min-h-[300px]">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-sm font-medium">กำลังโหลดข้อมูลกลุ่มสินค้า...</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
            <th className="p-4 w-[100px]">รูปภาพ</th>
            <th className="p-4">รหัสกลุ่ม</th>
            <th className="p-4">ชื่อหมวดหมู่ย่อย</th>
            <th className="p-4 text-center">จำนวนสินค้า</th>
            <th className="p-4 text-right">จัดการ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {groups.length === 0 ? (
            <tr>
              <td colSpan={5} className="p-12 text-center text-slate-500">
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                    <FolderOpen className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="font-medium">ยังไม่มีกลุ่มสินค้าในหมวดหมู่นี้</p>
                </div>
              </td>
            </tr>
          ) : (
            groups.map((group) => (
              <tr key={group.id} className="hover:bg-slate-50/80 transition-colors group">
                <td className="p-4">
                  <div className="w-16 h-16 rounded-lg border border-slate-200 bg-slate-100 overflow-hidden relative">
                    {group.image_url ? (
                      <img src={group.image_url} alt={group.product_sup || group.id} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <FolderOpen className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-4 align-middle">
                  <span className="font-bold text-slate-800 text-sm">{group.id}</span>
                </td>
                <td className="p-4 align-middle">
                  <span className="text-sm font-semibold text-slate-700">{group.product_sup || "ไม่มีชื่อหมวดหมู่"}</span>
                </td>
                <td className="p-4 text-center align-middle">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 font-bold">
                    {group.itemCount} ชิ้น
                  </span>
                </td>
                <td className="p-4 text-right align-middle">
                  <button
                    onClick={() => handleDelete(group.id, group.itemCount)}
                    disabled={deletingId === group.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-50 cursor-pointer active:scale-95 animate-fade-in"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {deletingId === group.id ? "กำลังลบ..." : "ลบกลุ่ม"}
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
