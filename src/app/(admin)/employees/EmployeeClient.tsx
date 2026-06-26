"use client"

import { useState } from "react"
import { updateEmployee, deleteEmployee, createEmployee } from "../../../actions/employees" // ตรวจสอบ path ให้ถูกนะครับ
import { Edit, Trash2, User, Shield, Briefcase, MapPin, X, Save, AlertCircle, Calendar, CreditCard, Phone, Plus, Key, Mail, Search, CheckCircle, XCircle } from "lucide-react"

// --- Interface ---
interface Branch { id: number; branch_name: string; branch_code: string }
interface Profile {
  user_id: string; 
  full_name: string | null; 
  email: string; 
  role: string; 
  phone: string | null;
  birth_date: string | null;
  avatar_url: string | null; 
  branch_id: number | null;
  branches: Branch | null;
}

// --- Component หลัก ---
export default function EmployeeClient({ initialData, branches, storageBaseUrl }: { initialData: Profile[], branches: Branch[], storageBaseUrl: string }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingEmp, setEditingEmp] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  // ✅ State สำหรับ Custom Alert
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
  }>({ isOpen: false, type: 'success', title: '', message: '' })

  // --- Helper Functions ---

  // 1. แปลง Error Database เป็นภาษาคน
  const handleServerError = (errorMsg: string) => {
    let friendlyMessage = errorMsg;

    if (errorMsg.includes("profiles_citizen_id_check")) {
      friendlyMessage = "❌ เลขบัตรประชาชนไม่ถูกต้อง กรุณาตรวจสอบว่ากรอกครบ 13 หลักและเป็นตัวเลขเท่านั้น";
    } else if (errorMsg.includes("duplicate key value")) {
      friendlyMessage = "❌ อีเมล หรือ ข้อมูลบางอย่างซ้ำกับในระบบ กรุณาตรวจสอบ";
    } else if (errorMsg.includes("auth/email-already-in-use")) {
        friendlyMessage = "❌ อีเมลนี้ถูกลงทะเบียนไปแล้ว";
    } else if (errorMsg.includes("invalid input syntax for type integer")) {
        friendlyMessage = "❌ ข้อมูลตัวเลขบางอย่างไม่ถูกต้อง";
    }

    setAlertState({
      isOpen: true,
      type: 'error',
      title: 'เกิดข้อผิดพลาด',
      message: friendlyMessage
    });
  }

  // 2. สร้าง URL รูปภาพ
  const getAvatarUrl = (path: string | null) => {
    if (!path) return null;
    if (path.startsWith('http') || path.startsWith('blob:')) return path;
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    if (cleanPath.startsWith('profiles/')) {
        return `${storageBaseUrl}/${cleanPath}`;
    } else {
        return `${storageBaseUrl}/profiles/${cleanPath}`;
    }
  };

  const roleColors: Record<string, string> = {
    admin: "bg-red-100 text-red-800 border-red-200",
    manager: "bg-purple-100 text-purple-800 border-purple-200",
    warehouse: "bg-orange-100 text-orange-800 border-orange-200",
    sale: "bg-blue-100 text-blue-800 border-blue-200",
    unassigned: "bg-slate-100 text-slate-500 border-slate-200"
  }

  // --- Handlers ---
  const handleUpdate = async (formData: FormData) => {
    if (!editingEmp) return
    setLoading(true)
    formData.append('user_id', editingEmp.user_id) 
    
    const res = await updateEmployee(formData)
    setLoading(false)

    if (res?.error) {
      handleServerError(res.error) // เรียกใช้ฟังก์ชันแจ้งเตือนแบบสวย
    } else {
      closeModal()
      setAlertState({
        isOpen: true,
        type: 'success',
        title: 'สำเร็จ!',
        message: 'บันทึกข้อมูลพนักงานเรียบร้อยแล้ว'
      });
      // รอ User กดปิด Alert ค่อย reload ก็ได้ หรือจะ reload เลยก็ได้
      // window.location.reload() 
    }
  }

  const handleCreate = async (formData: FormData) => {
    setLoading(true)
    const res = await createEmployee(formData)
    setLoading(false)

    if (res?.error) {
        handleServerError(res.error) // เรียกใช้ฟังก์ชันแจ้งเตือนแบบสวย
    } else {
      setIsCreateModalOpen(false)
      setAlertState({
        isOpen: true,
        type: 'success',
        title: 'สร้างบัญชีสำเร็จ!',
        message: 'พนักงานใหม่ถูกเพิ่มเข้าสู่ระบบแล้ว'
      });
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("ต้องการลบ User นี้ออกจากระบบถาวรใช่หรือไม่?")) return
    const res = await deleteEmployee(id)
    if (res?.error) {
        handleServerError(res.error)
    } else {
        window.location.reload()
    }
  }

  const closeModal = () => { setIsModalOpen(false); setEditingEmp(null); }

  const filteredData = initialData.filter(emp => 
    (emp.full_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (emp.email?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-6 min-h-screen bg-slate-50 font-sans pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <User className="w-7 h-7 text-blue-600" /> จัดการพนักงาน
          </h1>
          <p className="text-slate-500 text-sm mt-1">ทั้งหมด {initialData.length} บัญชี</p>
        </div>
        
        <div className="flex items-center gap-3">
            <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="ค้นหาชื่อ หรือ อีเมล..." 
                    className="pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center gap-2 font-bold active:scale-95"
            >
            <Plus className="w-5 h-5" /> เพิ่มพนักงาน
            </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50 border-b border-slate-200">
                <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ผู้ใช้งาน</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ตำแหน่ง</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">สาขา</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ติดต่อ</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">จัดการ</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {filteredData.map((emp) => {
                const avatarSrc = getAvatarUrl(emp.avatar_url);

                return (
                <tr key={emp.user_id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 overflow-hidden shrink-0 shadow-sm relative">
                            {avatarSrc ? (
                                <img 
                                    src={avatarSrc} 
                                    alt="Avatar"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.parentElement?.classList.add('show-fallback');
                                    }}
                                />
                            ) : null}
                            <div className={`absolute inset-0 flex items-center justify-center bg-blue-50 text-blue-600 font-bold text-sm ${avatarSrc ? '-z-10' : ''}`}>
                                {emp.full_name ? emp.full_name.charAt(0).toUpperCase() : <User className="w-5 h-5"/>}
                            </div>
                        </div>

                        <div>
                            <div className={`font-bold text-sm ${emp.full_name ? 'text-slate-800' : 'text-slate-400 italic'}`}>
                                {emp.full_name || "(ยังไม่ระบุชื่อ)"}
                            </div>
                            <div className="text-xs text-slate-500 font-mono">{emp.email}</div>
                        </div>
                    </div>
                    </td>
                    <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wide ${roleColors[emp.role] || roleColors.unassigned}`}>
                        {emp.role === 'unassigned' ? 'NO ROLE' : emp.role}
                    </span>
                    </td>
                    <td className="px-6 py-4">
                    {emp.role === 'admin' ? (
                        <span className="text-xs text-slate-400 italic font-medium flex items-center gap-1">
                            Global
                        </span>
                    ) : (
                        <div className="flex items-center gap-1.5 text-sm text-slate-700 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {emp.branches?.branch_name || <span className="text-slate-300">-</span>}
                        </div>
                    )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 font-mono">
                    {emp.phone || <span className="text-slate-300">-</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingEmp(emp); setIsModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition border border-transparent hover:border-blue-100 shadow-sm" title="แก้ไขข้อมูล">
                        <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(emp.user_id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition border border-transparent hover:border-red-100 shadow-sm" title="ลบ User">
                        <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                    </td>
                </tr>
                )})}
                
                {filteredData.length === 0 && (
                    <tr>
                        <td colSpan={5} className="text-center py-10 text-slate-400">
                            ไม่พบข้อมูลพนักงาน
                        </td>
                    </tr>
                )}
            </tbody>
            </table>
        </div>
      </div>

      {/* =================================================================================== */}
      {/* 🔥🔥🔥 CUSTOM ALERT MODAL (Full Screen) 🔥🔥🔥 */}
      {/* =================================================================================== */}
      {alertState.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col items-center p-6 animate-in zoom-in-95 duration-200">
                {/* Icon */}
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${alertState.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {alertState.type === 'success' ? <CheckCircle className="w-8 h-8"/> : <XCircle className="w-8 h-8"/>}
                </div>

                {/* Title */}
                <h3 className={`text-xl font-bold mb-2 ${alertState.type === 'success' ? 'text-slate-800' : 'text-red-600'}`}>
                    {alertState.title}
                </h3>

                {/* Message */}
                <p className="text-slate-500 text-center mb-6 text-sm leading-relaxed">
                    {alertState.message}
                </p>

                {/* Button */}
                <button 
                    onClick={() => {
                        setAlertState({ ...alertState, isOpen: false });
                        if (alertState.type === 'success') window.location.reload(); // ถ้าสำเร็จ พอกดปิดให้รีหน้าเว็บ
                    }}
                    className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 ${alertState.type === 'success' ? 'bg-green-600 hover:bg-green-700 shadow-green-200' : 'bg-slate-800 hover:bg-slate-900 shadow-slate-200'}`}
                >
                    {alertState.type === 'success' ? 'ตกลง' : 'รับทราบ'}
                </button>
            </div>
        </div>
      )}
      {/* =================================================================================== */}


      {/* --- Modal แก้ไข (Edit) --- */}
      {isModalOpen && editingEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
               <div>
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Edit className="w-4 h-4 text-blue-600" /> แก้ไขข้อมูลพนักงาน
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono">{editingEmp.email}</p>
               </div>
               <button onClick={closeModal} className="p-2 hover:bg-slate-200/50 rounded-full transition"><X className="w-5 h-5 text-slate-400"/></button>
            </div>
            
            <div className="overflow-y-auto p-6">
                <form onSubmit={async (e) => { e.preventDefault(); await handleUpdate(new FormData(e.currentTarget)); }} className="space-y-5">
                
                {editingEmp.role === 'unassigned' && (
                    <div className="bg-amber-50 text-amber-800 p-3 rounded-xl text-xs flex items-start gap-2 border border-amber-200">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                    <div>User นี้ยังไม่มีข้อมูล Profile ระบบจะสร้างข้อมูลใหม่ให้เมื่อคุณกดบันทึก</div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    
                    <div className="col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                            <input name="full_name" defaultValue={editingEmp.full_name || ""} className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="ระบุชื่อจริง..." required />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">เบอร์โทรศัพท์</label>
                        <div className="relative">
                            <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                            <input name="phone" defaultValue={editingEmp.phone || ""} className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="0xxxxxxxxx" />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">วันเกิด</label>
                        <div className="relative">
                            <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                            <input type="date" name="birth_date" defaultValue={editingEmp.birth_date || ""} className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none transition text-slate-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold text-blue-600 uppercase mb-1 flex items-center gap-1"><Shield className="w-3 h-3" /> ตำแหน่ง</label>
                            <select name="role" defaultValue={editingEmp.role === 'unassigned' ? 'sale' : editingEmp.role} className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                                <option value="sale">Sale (พนักงานขาย)</option>
                                <option value="manager">Manager (ผู้จัดการ)</option>
                                <option value="warehouse">Warehouse (คลัง)</option>
                                <option value="admin">Admin (ผู้ดูแลระบบ)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-blue-600 uppercase mb-1 flex items-center gap-1"><Briefcase className="w-3 h-3" /> สาขา</label>
                            <select name="branch_id" defaultValue={editingEmp.branch_id || ""} className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                                <option value="">-- เลือกสาขา --</option>
                                {branches.map(b => (
                                    <option key={b.id} value={b.id}>{b.branch_name} ({b.branch_code})</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button type="button" onClick={closeModal} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition">ยกเลิก</button>
                    <button type="submit" disabled={loading} className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200 transition font-bold flex items-center gap-2">
                    {loading ? "บันทึก..." : <><Save className="w-4 h-4"/> บันทึกข้อมูล</>}</button>
                </div>

                </form>
            </div>
          </div>
        </div>
      )}

      {/* --- Modal สร้าง (Create) --- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-blue-50/50">
               <div><h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><User className="w-5 h-5 text-blue-600" /> เพิ่มพนักงานใหม่</h2><p className="text-xs text-slate-500 mt-0.5">สร้างบัญชีผู้ใช้และข้อมูลพนักงาน</p></div>
               <button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-slate-200/50 rounded-full transition"><X className="w-5 h-5 text-slate-400"/></button>
            </div>
            
            <div className="overflow-y-auto p-6">
                <form onSubmit={async (e) => { e.preventDefault(); await handleCreate(new FormData(e.currentTarget)); }} className="space-y-5">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4"><div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">ข้อมูลบัญชี (Login)</div><div className="grid grid-cols-2 gap-4"><div className="col-span-2"><label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">อีเมล <span className="text-red-500">*</span></label><div className="relative"><Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" /><input type="email" name="email" className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="example@mail.com" required /></div></div><div className="col-span-2"><label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">รหัสผ่าน <span className="text-red-500">*</span></label><div className="relative"><Key className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" /><input type="password" name="password" className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="กำหนดรหัสผ่าน..." required minLength={6} /></div></div></div></div>
                <div className="grid grid-cols-2 gap-4"><div className="col-span-2"><label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">ชื่อ-นามสกุล <span className="text-red-500">*</span></label><div className="relative"><User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" /><input name="full_name" className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="ระบุชื่อจริง..." required /></div></div><div><label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">เบอร์โทรศัพท์</label><div className="relative"><Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" /><input name="phone" className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0xxxxxxxxx" /></div></div><div className="col-span-2"><label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">วันเกิด</label><div className="relative"><Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" /><input type="date" name="birth_date" className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none text-slate-600" /></div></div></div>
                <div className="grid grid-cols-2 gap-4"><div><label className="text-[10px] font-bold text-blue-600 uppercase mb-1 flex items-center gap-1"><Shield className="w-3 h-3" /> ตำแหน่ง</label><select name="role" className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"><option value="sale">Sale</option><option value="manager">Manager</option><option value="warehouse">Warehouse</option><option value="admin">Admin</option></select></div><div><label className="text-[10px] font-bold text-blue-600 uppercase mb-1 flex items-center gap-1"><Briefcase className="w-3 h-3" /> สาขา</label><select name="branch_id" className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"><option value="">-- เลือกสาขา --</option>{branches.map(b => (<option key={b.id} value={b.id}>{b.branch_name}</option>))}</select></div></div>
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100"><button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition">ยกเลิก</button><button type="submit" disabled={loading} className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200 transition font-bold flex items-center gap-2">{loading ? "กำลังสร้าง..." : <><Plus className="w-4 h-4"/> สร้างบัญชี</>}</button></div>
                </form>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}