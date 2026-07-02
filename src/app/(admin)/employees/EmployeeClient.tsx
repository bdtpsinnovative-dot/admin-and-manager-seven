"use client"

import { useState, useMemo } from "react"
import { updateEmployee, deleteEmployee, createEmployee } from "../../../actions/employees"
import {
  Edit, Trash2, User, Shield, Briefcase, MapPin, X, Save,
  AlertCircle, Calendar, Phone, Plus, Key, Mail, Search,
  CheckCircle, XCircle, Users, Building2, Filter, ChevronDown,
  UserPlus, Eye, EyeOff
} from "lucide-react"

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

// --- Role config ---
const ROLE_CONFIG: Record<string, { label: string; labelTh: string; color: string; bg: string; border: string; dot: string; icon: string }> = {
  admin:     { label: "Admin",     labelTh: "ผู้ดูแลระบบ",  color: "text-rose-700",    bg: "bg-rose-50",     border: "border-rose-200",    dot: "bg-rose-500",    icon: "" },
  manager:   { label: "Manager",   labelTh: "ผู้จัดการ",     color: "text-violet-700",  bg: "bg-violet-50",   border: "border-violet-200",  dot: "bg-violet-500",  icon: "" },
  warehouse: { label: "Warehouse", labelTh: "คลังสินค้า",   color: "text-amber-700",   bg: "bg-amber-50",    border: "border-amber-200",   dot: "bg-amber-500",   icon: "" },
  sale:      { label: "Sale",      labelTh: "พนักงานขาย",   color: "text-sky-700",     bg: "bg-sky-50",      border: "border-sky-200",     dot: "bg-sky-500",     icon: "" },
  unassigned:{ label: "No Role",   labelTh: "ยังไม่กำหนด",  color: "text-slate-500",   bg: "bg-slate-50",    border: "border-slate-200",   dot: "bg-slate-400",   icon: "" },
}

// --- Component หลัก ---
export default function EmployeeClient({ initialData, branches, storageBaseUrl }: { initialData: Profile[], branches: Branch[], storageBaseUrl: string }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingEmp, setEditingEmp] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterRole, setFilterRole] = useState("all")
  const [filterBranch, setFilterBranch] = useState("all")
  const [showPassword, setShowPassword] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deletingEmp, setDeletingEmp] = useState<Profile | null>(null)

  // ✅ State สำหรับ Custom Alert
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
  }>({ isOpen: false, type: 'success', title: '', message: '' })

  // --- Helper Functions ---
  const handleServerError = (errorMsg: string) => {
    let friendlyMessage = errorMsg;
    if (errorMsg.includes("profiles_citizen_id_check")) {
      friendlyMessage = "เลขบัตรประชาชนไม่ถูกต้อง กรุณาตรวจสอบว่ากรอกครบ 13 หลัก";
    } else if (errorMsg.includes("duplicate key value")) {
      friendlyMessage = "อีเมล หรือ ข้อมูลบางอย่างซ้ำกับในระบบ กรุณาตรวจสอบ";
    } else if (errorMsg.includes("auth/email-already-in-use")) {
      friendlyMessage = "อีเมลนี้ถูกลงทะเบียนไปแล้ว";
    } else if (errorMsg.includes("invalid input syntax for type integer")) {
      friendlyMessage = "ข้อมูลตัวเลขบางอย่างไม่ถูกต้อง";
    }
    setAlertState({ isOpen: true, type: 'error', title: 'เกิดข้อผิดพลาด', message: friendlyMessage });
  }

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

  // --- Stats ---
  const stats = useMemo(() => {
    const roleCounts: Record<string, number> = {}
    initialData.forEach(emp => {
      const r = emp.role || 'unassigned'
      roleCounts[r] = (roleCounts[r] || 0) + 1
    })
    const uniqueBranches = new Set(initialData.map(e => e.branch_id).filter(Boolean))
    return { total: initialData.length, roleCounts, branchCount: uniqueBranches.size }
  }, [initialData])

  // --- Filtered Data ---
  const filteredData = useMemo(() => {
    return initialData.filter(emp => {
      const matchSearch =
        (emp.full_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (emp.email?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (emp.phone || "").includes(searchTerm)
      const matchRole = filterRole === "all" || emp.role === filterRole
      const matchBranch = filterBranch === "all" || String(emp.branch_id) === filterBranch
      return matchSearch && matchRole && matchBranch
    })
  }, [initialData, searchTerm, filterRole, filterBranch])

  // --- Handlers ---
  const handleUpdate = async (formData: FormData) => {
    if (!editingEmp) return
    setLoading(true)
    formData.append('user_id', editingEmp.user_id)
    const res = await updateEmployee(formData)
    setLoading(false)
    if (res?.error) {
      handleServerError(res.error)
    } else {
      closeModal()
      setAlertState({ isOpen: true, type: 'success', title: 'สำเร็จ!', message: 'บันทึกข้อมูลพนักงานเรียบร้อยแล้ว' });
    }
  }

  const handleCreate = async (formData: FormData) => {
    setLoading(true)
    const res = await createEmployee(formData)
    setLoading(false)
    if (res?.error) {
      handleServerError(res.error)
    } else {
      setIsCreateModalOpen(false)
      setAlertState({ isOpen: true, type: 'success', title: 'สร้างบัญชีสำเร็จ!', message: 'พนักงานใหม่ถูกเพิ่มเข้าสู่ระบบแล้ว' });
    }
  }

  const handleDelete = async () => {
    if (!deletingEmp) return
    setLoading(true)
    const res = await deleteEmployee(deletingEmp.user_id)
    setLoading(false)
    if (res?.error) {
      handleServerError(res.error)
    } else {
      setIsDeleteModalOpen(false)
      setDeletingEmp(null)
      window.location.reload()
    }
  }

  const closeModal = () => { setIsModalOpen(false); setEditingEmp(null); }

  const getRoleInfo = (role: string) => ROLE_CONFIG[role] || ROLE_CONFIG.unassigned

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 font-sans pb-20">

      {/* ====== Page Header ====== */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200/60">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">
                  จัดการพนักงาน
                </h1>
                <p className="text-slate-500 text-sm mt-0.5">บริหารจัดการข้อมูลพนักงานทั้งระบบ</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => { setIsCreateModalOpen(true); setShowPassword(false); }}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-2xl shadow-lg shadow-blue-300/40 transition-all flex items-center gap-2.5 font-bold active:scale-[0.97] text-sm group"
          >
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition">
              <UserPlus className="w-4 h-4" />
            </div>
            เพิ่มพนักงานใหม่
          </button>
        </div>
      </div>

      {/* ====== Stats Cards ====== */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-8">
        {/* Total */}
        <div className="col-span-2 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white shadow-xl shadow-slate-300/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">พนักงานทั้งหมด</p>
            <p className="text-4xl font-black">{stats.total}</p>
            <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
              <Building2 className="w-3.5 h-3.5" />
              <span>{stats.branchCount} สาขา</span>
            </div>
          </div>
        </div>

        {/* Role cards */}
        {Object.entries(ROLE_CONFIG).filter(([key]) => key !== 'unassigned').map(([key, cfg]) => (
          <div
            key={key}
            className={`${cfg.bg} ${cfg.border} border rounded-2xl p-4 relative overflow-hidden hover:shadow-md transition-all duration-300 cursor-default group`}
          >
            {cfg.icon && <div className="absolute top-2 right-3 text-2xl opacity-60 group-hover:scale-110 transition-transform">{cfg.icon}</div>}
            <p className={`text-[10px] font-bold uppercase tracking-wider ${cfg.color} opacity-70`}>{cfg.label}</p>
            <p className={`text-2xl font-black mt-1 ${cfg.color}`}>{stats.roleCounts[key] || 0}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{cfg.labelTh}</p>
          </div>
        ))}
      </div>

      {/* ====== Search & Filters ====== */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ, อีเมล หรือเบอร์โทร..."
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition bg-slate-50/50 placeholder:text-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Role Filter */}
          <div className="relative min-w-[170px]">
            <Filter className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full pl-9 pr-8 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition bg-slate-50/50 appearance-none cursor-pointer"
            >
              <option value="all">ทุกตำแหน่ง</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="warehouse">Warehouse</option>
              <option value="sale">Sale</option>
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Branch Filter */}
          <div className="relative min-w-[180px]">
            <Building2 className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="w-full pl-9 pr-8 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition bg-slate-50/50 appearance-none cursor-pointer"
            >
              <option value="all">ทุกสาขา</option>
              {branches.map(b => (
                <option key={b.id} value={String(b.id)}>{b.branch_name}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Active filters count */}
        {(filterRole !== "all" || filterBranch !== "all" || searchTerm) && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-500">
              แสดง <span className="font-bold text-slate-800">{filteredData.length}</span> จาก {initialData.length} รายการ
            </span>
            <button
              onClick={() => { setSearchTerm(""); setFilterRole("all"); setFilterBranch("all"); }}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium ml-auto flex items-center gap-1 hover:underline"
            >
              <X className="w-3 h-3" /> ล้างตัวกรอง
            </button>
          </div>
        )}
      </div>

      {/* ====== Table ====== */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">พนักงาน</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">ตำแหน่ง</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">สาขา</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">เบอร์โทร</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden lg:table-cell">วันเกิด</th>
                <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              {filteredData.map((emp, idx) => {
                const avatarSrc = getAvatarUrl(emp.avatar_url);
                const roleInfo = getRoleInfo(emp.role);
                return (
                  <tr
                    key={emp.user_id}
                    className="hover:bg-blue-50/30 transition-all duration-200 group"
                    style={{ animationDelay: `${idx * 30}ms` }}
                  >
                    {/* Avatar + Name */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-600 border border-blue-200/60 overflow-hidden shrink-0 shadow-sm relative">
                          {avatarSrc ? (
                            <img
                              src={avatarSrc}
                              alt="Avatar"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : null}
                          <div className={`absolute inset-0 flex items-center justify-center font-bold text-sm ${avatarSrc ? '-z-10' : ''}`}>
                            {emp.full_name ? emp.full_name.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className={`font-semibold text-sm truncate ${emp.full_name ? 'text-slate-800' : 'text-slate-400 italic'}`}>
                            {emp.full_name || "(ยังไม่ระบุชื่อ)"}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono truncate max-w-[200px]">{emp.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Role Badge */}
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border ${roleInfo.bg} ${roleInfo.color} ${roleInfo.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${roleInfo.dot}`} />
                        {roleInfo.label}
                      </div>
                    </td>

                    {/* Branch */}
                    <td className="px-6 py-4">
                      {emp.role === 'admin' ? (
                        <span className="text-xs text-slate-400 italic font-medium flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5" /> Global Access
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5 text-sm text-slate-700 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[140px]">{emp.branches?.branch_name || <span className="text-slate-300">-</span>}</span>
                        </div>
                      )}
                    </td>

                    {/* Phone */}
                    <td className="px-6 py-4">
                      {emp.phone ? (
                        <span className="text-sm text-slate-600 font-mono tracking-wide">{emp.phone}</span>
                      ) : (
                        <span className="text-slate-300 text-sm">-</span>
                      )}
                    </td>

                    {/* Birth Date */}
                    <td className="px-6 py-4 hidden lg:table-cell">
                      {emp.birth_date ? (
                        <span className="text-sm text-slate-500 font-mono">
                          {new Date(emp.birth_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-sm">-</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
                        <button
                          onClick={() => { setEditingEmp(emp); setIsModalOpen(true); }}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-all active:scale-90"
                          title="แก้ไขข้อมูล"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setDeletingEmp(emp); setIsDeleteModalOpen(true); }}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all active:scale-90"
                          title="ลบ User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}

              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <Users className="w-8 h-8 text-slate-300" />
                      </div>
                      <div>
                        <p className="text-slate-400 font-semibold">ไม่พบข้อมูลพนักงาน</p>
                        <p className="text-slate-300 text-sm mt-1">ลองปรับตัวกรองหรือคำค้นหา</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        {filteredData.length > 0 && (
          <div className="px-6 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              แสดง {filteredData.length} จาก {initialData.length} รายการ
            </span>
          </div>
        )}
      </div>

      {/* =================================================================================== */}
      {/* 🔔 CUSTOM ALERT MODAL */}
      {/* =================================================================================== */}
      {alertState.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" style={{ animation: 'fadeIn 0.2s ease-out' }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col items-center p-8" style={{ animation: 'scaleIn 0.25s ease-out' }}>
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-5 ${alertState.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
              {alertState.type === 'success' ? <CheckCircle className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
            </div>
            <h3 className={`text-xl font-extrabold mb-2 ${alertState.type === 'success' ? 'text-slate-800' : 'text-red-600'}`}>
              {alertState.title}
            </h3>
            <p className="text-slate-500 text-center mb-8 text-sm leading-relaxed px-2">
              {alertState.message}
            </p>
            <button
              onClick={() => {
                setAlertState({ ...alertState, isOpen: false });
                if (alertState.type === 'success') window.location.reload();
              }}
              className={`w-full py-3.5 rounded-2xl font-bold text-white shadow-lg transition-all active:scale-[0.97] ${alertState.type === 'success' ? 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-emerald-200/50' : 'bg-slate-800 hover:bg-slate-900 shadow-slate-200/50'}`}
            >
              {alertState.type === 'success' ? 'ตกลง' : 'รับทราบ'}
            </button>
          </div>
        </div>
      )}

      {/* =================================================================================== */}
      {/* 🗑️ DELETE CONFIRM MODAL */}
      {/* =================================================================================== */}
      {isDeleteModalOpen && deletingEmp && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" style={{ animation: 'fadeIn 0.2s ease-out' }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col items-center p-8" style={{ animation: 'scaleIn 0.25s ease-out' }}>
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-5">
              <Trash2 className="w-9 h-9 text-red-500" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-800 mb-2">ยืนยันการลบ</h3>
            <p className="text-slate-500 text-center text-sm leading-relaxed mb-2">
              คุณต้องการลบบัญชีพนักงานนี้ออกจากระบบ<br />อย่างถาวรใช่หรือไม่?
            </p>
            <div className="bg-red-50 rounded-xl px-4 py-3 w-full mb-6 border border-red-100">
              <p className="text-sm font-bold text-slate-700">{deletingEmp.full_name || "(ไม่ระบุชื่อ)"}</p>
              <p className="text-xs text-slate-400 font-mono">{deletingEmp.email}</p>
            </div>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => { setIsDeleteModalOpen(false); setDeletingEmp(null); }}
                className="flex-1 py-3 rounded-2xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all active:scale-[0.97]"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 py-3 rounded-2xl font-bold text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-lg shadow-red-200/50 transition-all active:scale-[0.97] disabled:opacity-50"
              >
                {loading ? "กำลังลบ..." : "ลบถาวร"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================================== */}
      {/* ✏️ EDIT MODAL */}
      {/* =================================================================================== */}
      {isModalOpen && editingEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" style={{ animation: 'fadeIn 0.2s ease-out' }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]" style={{ animation: 'scaleIn 0.25s ease-out' }}>

            {/* Header */}
            <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md">
                  <Edit className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-800">แก้ไขข้อมูล</h2>
                  <p className="text-[11px] text-slate-500 font-mono">{editingEmp.email}</p>
                </div>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-slate-200/50 rounded-xl transition active:scale-90">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto p-6">
              <form onSubmit={async (e) => { e.preventDefault(); await handleUpdate(new FormData(e.currentTarget)); }} className="space-y-5">

                {editingEmp.role === 'unassigned' && (
                  <div className="bg-amber-50 text-amber-800 p-3.5 rounded-xl text-xs flex items-start gap-2.5 border border-amber-200">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                    <div>User นี้ยังไม่มีข้อมูล Profile — ระบบจะสร้างข้อมูลใหม่ให้เมื่อคุณกดบันทึก</div>
                  </div>
                )}

                {/* Personal Info */}
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ข้อมูลส่วนตัว</p>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                      <input name="full_name" defaultValue={editingEmp.full_name || ""} className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 outline-none transition bg-slate-50/30" placeholder="ระบุชื่อจริง-นามสกุล" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1.5 block">เบอร์โทรศัพท์</label>
                      <div className="relative">
                        <Phone className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                        <input name="phone" defaultValue={editingEmp.phone || ""} className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 outline-none transition bg-slate-50/30" placeholder="0xxxxxxxxx" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1.5 block">วันเกิด</label>
                      <div className="relative">
                        <Calendar className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                        <input type="date" name="birth_date" defaultValue={editingEmp.birth_date || ""} className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 outline-none transition bg-slate-50/30 text-slate-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Role & Branch */}
                <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/30 p-4 rounded-2xl border border-blue-200/50 space-y-4">
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
                    <Shield className="w-3 h-3" /> การจัดการสิทธิ์
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1.5 block">ตำแหน่ง</label>
                      <select name="role" defaultValue={editingEmp.role === 'unassigned' ? 'sale' : editingEmp.role} className="w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 outline-none appearance-none cursor-pointer">
                        <option value="sale">Sale (พนักงานขาย)</option>
                        <option value="manager">Manager (ผู้จัดการ)</option>
                        <option value="warehouse">Warehouse (คลัง)</option>
                        <option value="admin">Admin (ผู้ดูแล)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1.5 block">สาขา</label>
                      <select name="branch_id" defaultValue={editingEmp.branch_id || ""} className="w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 outline-none appearance-none cursor-pointer">
                        <option value="">-- เลือกสาขา --</option>
                        {branches.map(b => (
                          <option key={b.id} value={b.id}>{b.branch_name} ({b.branch_code})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button type="button" onClick={closeModal} className="px-5 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-semibold transition active:scale-[0.97]">
                    ยกเลิก
                  </button>
                  <button type="submit" disabled={loading} className="px-6 py-2.5 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-200/50 transition-all font-bold flex items-center gap-2 active:scale-[0.97] disabled:opacity-50">
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        กำลังบันทึก...
                      </span>
                    ) : (
                      <><Save className="w-4 h-4" /> บันทึกข้อมูล</>
                    )}
                  </button>
                </div>

              </form>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================================== */}
      {/* ➕ CREATE MODAL */}
      {/* =================================================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" style={{ animation: 'fadeIn 0.2s ease-out' }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]" style={{ animation: 'scaleIn 0.25s ease-out' }}>

            {/* Header */}
            <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md">
                  <UserPlus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-800">เพิ่มพนักงานใหม่</h2>
                  <p className="text-[11px] text-slate-500">สร้างบัญชีผู้ใช้และข้อมูลพนักงาน</p>
                </div>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-slate-200/50 rounded-xl transition active:scale-90">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto p-6">
              <form onSubmit={async (e) => { e.preventDefault(); await handleCreate(new FormData(e.currentTarget)); }} className="space-y-5">

                {/* Account Info */}
                <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 p-4 rounded-2xl border border-slate-200 space-y-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Key className="w-3 h-3" /> ข้อมูลบัญชี (Login)
                  </p>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">อีเมล <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                      <input type="email" name="email" className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 outline-none transition bg-white" placeholder="example@mail.com" required />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">รหัสผ่าน <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Key className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        className="w-full pl-10 pr-12 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 outline-none transition bg-white font-mono"
                        placeholder="กำหนดรหัสผ่าน..."
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 p-0.5 text-slate-400 hover:text-slate-600 transition"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Personal Info */}
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ข้อมูลส่วนตัว</p>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                      <input name="full_name" className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 outline-none transition bg-slate-50/30" placeholder="ระบุชื่อจริง-นามสกุล" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1.5 block">เบอร์โทรศัพท์</label>
                      <div className="relative">
                        <Phone className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                        <input name="phone" className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 outline-none transition bg-slate-50/30" placeholder="0xxxxxxxxx" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1.5 block">วันเกิด</label>
                      <div className="relative">
                        <Calendar className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                        <input type="date" name="birth_date" className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 outline-none transition bg-slate-50/30 text-slate-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Role & Branch */}
                <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/30 p-4 rounded-2xl border border-blue-200/50 space-y-4">
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
                    <Shield className="w-3 h-3" /> ตำแหน่งและสาขา
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1.5 block">ตำแหน่ง</label>
                      <select name="role" className="w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 outline-none appearance-none cursor-pointer">
                        <option value="sale">Sale</option>
                        <option value="manager">Manager</option>
                        <option value="warehouse">Warehouse</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1.5 block">สาขา</label>
                      <select name="branch_id" className="w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 outline-none appearance-none cursor-pointer">
                        <option value="">-- เลือกสาขา --</option>
                        {branches.map(b => (
                          <option key={b.id} value={b.id}>{b.branch_name} ({b.branch_code})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-5 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-semibold transition active:scale-[0.97]">
                    ยกเลิก
                  </button>
                  <button type="submit" disabled={loading} className="px-6 py-2.5 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-200/50 transition-all font-bold flex items-center gap-2 active:scale-[0.97] disabled:opacity-50">
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        กำลังสร้าง...
                      </span>
                    ) : (
                      <><Plus className="w-4 h-4" /> สร้างบัญชี</>
                    )}
                  </button>
                </div>

              </form>
            </div>
          </div>
        </div>
      )}

      {/* Global Animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

    </div>
  )
}