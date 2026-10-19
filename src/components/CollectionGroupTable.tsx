"use client";

import { useState, useEffect } from "react";
import { Trash2, FolderOpen, AlertCircle, RefreshCw } from "lucide-react";
import { getCollectionGroupsWithCounts, deleteCollectionGroup } from "../actions/woodslab";
import FeedbackModal, { type FeedbackModalType } from "./ui/FeedbackModal";

export default function CollectionGroupTable({ tag }: { tag: 'furniture' | 'prop' }) {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 🌟 State สำหรับ FeedbackModal สวยๆ กลางจอ
  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean
    type?: FeedbackModalType
    title: string
    subtitle?: string
    message?: string
    details?: string | string[]
    confirmText?: string
    cancelText?: string
    confirmVariant?: 'danger' | 'primary' | 'success'
    onConfirm?: () => void
  }>({
    isOpen: false,
    title: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getCollectionGroupsWithCounts(tag);
      if (res.error) {
        setFeedbackModal({
          isOpen: true,
          type: 'error',
          title: 'โหลดข้อมูลกลุ่มสินค้าไม่สำเร็จ',
          message: res.error,
          confirmText: 'รับทราบ',
          confirmVariant: 'danger'
        });
      } else {
        setGroups(res.data || []);
      }
    } catch (err: any) {
      setFeedbackModal({
        isOpen: true,
        type: 'error',
        title: 'เกิดข้อผิดพลาดในการโหลดข้อมูล',
        message: err.message,
        confirmText: 'ปิด',
        confirmVariant: 'danger'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tag]);

  const handleDelete = (groupId: string, itemCount: number) => {
    setFeedbackModal({
      isOpen: true,
      type: 'danger',
      title: 'ยืนยันการลบกลุ่มสินค้า',
      subtitle: `รหัสกลุ่ม: ${groupId}`,
      message: `คุณแน่ใจหรือไม่ที่จะลบกลุ่มสินค้านี้ออกจากระบบ?`,
      details: [
        `การลบกลุ่มนี้จะทำการลบสินค้าที่อยู่ภายในกลุ่มจำนวน ${itemCount.toLocaleString()} ชิ้นไปด้วย`,
        'ระบบจะอนุญาตให้ลบได้เฉพาะสินค้าที่สต็อกเป็น 0 ทุกสาขาเท่านั้น',
        'หากมีสินค้าชิ้นใดเคยมีประวัติการเคลื่อนไหวสต็อกหรือมีประวัติการขาย ระบบจะบล็อกการลบเพื่อความปลอดภัย'
      ],
      confirmText: 'ยืนยันการลบกลุ่ม',
      cancelText: 'ยกเลิก',
      confirmVariant: 'danger',
      onConfirm: async () => {
        setDeletingId(groupId);
        try {
          const res = await deleteCollectionGroup(groupId);
          if (res.error) {
            setFeedbackModal({
              isOpen: true,
              type: 'warning',
              title: 'ไม่สามารถลบกลุ่มสินค้านี้ได้',
              subtitle: 'ติดเงื่อนไขความปลอดภัยของสินค้าภายในกลุ่ม',
              message: res.error,
              confirmText: 'รับทราบ',
              confirmVariant: 'primary'
            });
          } else {
            setFeedbackModal({
              isOpen: true,
              type: 'success',
              title: 'ลบกลุ่มสินค้าสำเร็จ',
              message: `ลบกลุ่มสินค้า "${groupId}" เรียบร้อยแล้วครับนาย`,
              confirmText: 'ตกลง',
              confirmVariant: 'success',
              onConfirm: async () => {
                await loadData();
              }
            });
          }
        } catch (err: any) {
          setFeedbackModal({
            isOpen: true,
            type: 'error',
            title: 'เกิดข้อผิดพลาด',
            message: err.message || 'ไม่สามารถลบกลุ่มสินค้าได้',
            confirmText: 'ปิด',
            confirmVariant: 'danger'
          });
        } finally {
          setDeletingId(null);
        }
      }
    });
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
            groups.map((group) => {
              const displayImage = group.cover_image_url || group.image_url;
              return (
                <tr key={group.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="p-4">
                    <div className="w-16 h-16 rounded-lg border border-slate-200 bg-slate-100 overflow-hidden relative">
                      {displayImage ? (
                        <img src={displayImage} alt={group.name || group.product_sup || group.id} className="w-full h-full object-cover" />
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
                    <div className="flex flex-col">
                      {group.name && (
                        <span className="text-sm font-bold text-slate-800">{group.name}</span>
                      )}
                      <span className="text-xs font-semibold text-slate-500">{group.product_sup || "ไม่มีชื่อหมวดหมู่"}</span>
                    </div>
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
            );
          })
        )}
        </tbody>
      </table>

      {/* 🌟 ป๊อปอัปแจ้งเตือนและยืนยันการกระทำกลางจอ (FeedbackModal) */}
      <FeedbackModal
        isOpen={feedbackModal.isOpen}
        type={feedbackModal.type}
        title={feedbackModal.title}
        subtitle={feedbackModal.subtitle}
        message={feedbackModal.message}
        details={feedbackModal.details}
        confirmText={feedbackModal.confirmText}
        cancelText={feedbackModal.cancelText}
        confirmVariant={feedbackModal.confirmVariant}
        isLoading={Boolean(deletingId)}
        onConfirm={feedbackModal.onConfirm}
        onClose={() => setFeedbackModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
