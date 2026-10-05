"use client"

import { useState, useMemo } from "react"
import { updateEmployee, deleteEmployee, createEmployee } from "../../../actions/employees"
import {
  Edit, Trash2, User, Shield, Briefcase, MapPin, X, Save,
  AlertCircle, Calendar, Phone, Plus, Key, Mail, Search,
  CheckCircle, XCircle, Users, Building2, Filter, ChevronDown,
  UserPlus, Eye, EyeOff, LayoutDashboard, History, Box,
  PackagePlus, Frame, Activity, Images, Tag, Scale,
  AlertTriangle, ShieldCheck, SlidersHorizontal, Settings,
  Layers, Hammer, Armchair, Package, Monitor, DollarSign,
  Lock, Store, BarChart3, FileText, Check
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
  allowed_inventory_tabs?: string[];
  allowed_pages?: string[];
  branches: Branch | null;
  can_view_costs?: boolean;
}

// --- Role config ---
const ROLE_CONFIG: Record<string, { label: string; labelTh: string; color: string; bg: string; border: string; dot: string; Icon: any }> = {
  admin:        { label: "Admin",        labelTh: "ผู้ดูแลระบบ",           color: "text-rose-700",    bg: "bg-rose-50",     border: "border-rose-200",    dot: "bg-rose-500",    Icon: ShieldCheck },
  manager:      { label: "Manager",      labelTh: "ผู้จัดการ",            color: "text-violet-700",  bg: "bg-violet-50",   border: "border-violet-200",  dot: "bg-violet-500",  Icon: Briefcase },
  sale:         { label: "Sale",         labelTh: "พนักงานขาย",          color: "text-sky-700",     bg: "bg-sky-50",      border: "border-sky-200",     dot: "bg-sky-500",     Icon: Tag },
  data_entry:   { label: "Data Entry",   labelTh: "เจ้าหน้าที่บันทึกข้อมูล", color: "text-amber-700",   bg: "bg-amber-50",    border: "border-amber-200",   dot: "bg-amber-500",   Icon: FileText },
  data_analyst: { label: "Data Analyst", labelTh: "นักวิเคราะห์ข้อมูล",     color: "text-indigo-700",  bg: "bg-indigo-50",   border: "border-indigo-200",  dot: "bg-indigo-500",  Icon: BarChart3 },
  warehouse:    { label: "Warehouse",    labelTh: "คลังสินค้า",           color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-500", Icon: Package },
}

// --- หมวดหมู่สินค้าในคลัง ---
const CATEGORY_ITEMS = [
  { id: 'SLABS',     label: 'Wood Slabs', labelTh: 'แผ่นไม้',     color: 'border-blue-300 text-blue-700 bg-blue-50',    badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',    Icon: Layers },
  { id: 'ROUGH',     label: 'Rough Wood', labelTh: 'ไม้ดิบ',     color: 'border-orange-300 text-orange-700 bg-orange-50',badgeBg: 'bg-orange-100 text-orange-800 border-orange-200',Icon: Hammer },
  { id: 'PROP',      label: 'Props',      labelTh: 'พร็อพ',       color: 'border-purple-300 text-purple-700 bg-purple-50',badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',Icon: Box },
  { id: 'FURNITURE', label: 'Furniture',  labelTh: 'เฟอร์นิเจอร์', color: 'border-emerald-300 text-emerald-700 bg-emerald-50',badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',Icon: Armchair },
]

// --- รายการหน้าเมนูทั้งหมดในระบบ (ตรงกับ AdminSidebar) ---
const PAGE_ITEMS = [
  // 1. เมนูหลัก (งานประจำวัน)
  { href: '/dashboard',              label: 'Dashboard',                 group: 'primary',   Icon: LayoutDashboard },
  { href: '/sales-history',          label: 'ประวัติการขายหน้าร้าน',      group: 'primary',   Icon: History },
  { href: '/inventory',              label: 'สินค้าทั้งหมด',              group: 'primary',   Icon: Box },
  { href: '/stock-in',               label: 'รับสินค้าเข้า (Stock In)',   group: 'primary',   Icon: PackagePlus },
  { href: '/propsfina',              label: 'Props / Decor',             group: 'primary',   Icon: Frame },
  { href: '/algorithm',              label: 'Algorithm',                 group: 'primary',   Icon: Activity },
  // 2. เมนูการจัดการและรายงาน (Management)
  { href: '/web-gallery',            label: 'จัดการ แกลเลอลี่หน้าเว็ป',    group: 'secondary', Icon: Images },
  { href: '/gallery',                label: 'คลังรูปภาพต้นฉบับ (R2)',     group: 'secondary', Icon: Images },
  { href: '/discounts',              label: 'ส่วนลด & โปรโมชัน',         group: 'secondary', Icon: Tag },
  { href: '/branches',               label: 'จัดการสาขา',                group: 'secondary', Icon: MapPin },
  { href: '/employees',              label: 'พนักงาน',                   group: 'secondary', Icon: Users },
  { href: '/balance-check',          label: 'ตรวจสอบยอดรวมระบบ',         group: 'secondary', Icon: Scale },
  { href: '/rfid-mismatch',          label: 'ตรวจสอบ RFID ยอดเกิน',      group: 'secondary', Icon: AlertTriangle },
  { href: '/stock-audit',            label: 'อนุมัติตรวจนับสต็อก',         group: 'secondary', Icon: ShieldCheck },
  { href: '/manager/damage-history', label: 'ประวัติสินค้าเสียหาย',       group: 'secondary', Icon: Trash2 },
  { href: '/filters',                label: 'จัดการ Filters',            group: 'secondary', Icon: SlidersHorizontal },
  { href: '/app-management',         label: 'จัดการแอป & เว็บ',           group: 'secondary', Icon: Settings },
  { href: '/backup',                 label: 'Backup & Restore',          group: 'secondary', Icon: ShieldCheck },
]

const ALL_PAGE_HREFS = PAGE_ITEMS.map(p => p.href)

function getDefaultPagesByRole(role: string): string[] {
  if (role === 'admin') return ALL_PAGE_HREFS
  if (role === 'data_analyst') {
    return [
      '/dashboard', '/sales-history', '/inventory', '/stock-in', '/algorithm',
      '/balance-check', '/rfid-mismatch', '/stock-audit', '/manager/damage-history', '/filters'
    ]
  }
  if (role === 'data_entry' || role === 'warehouse') {
    return ['/inventory', '/stock-in', '/propsfina']
  }
  return ['/inventory', '/sales-history']
}

// --- Component หลัก ---
export default function EmployeeClient({ initialData, branches, storageBaseUrl }: { initialData: Profile[], branches: Branch[], storageBaseUrl: string }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isMatrixModalOpen, setIsMatrixModalOpen] = useState(false)
  const [editingEmp, setEditingEmp] = useState<Profile | null>(null)
  const [editCategories, setEditCategories] = useState<string[]>(['SLABS', 'ROUGH', 'PROP', 'FURNITURE'])
  const [createCategories, setCreateCategories] = useState<string[]>(['SLABS', 'ROUGH', 'PROP', 'FURNITURE'])
  const [editPages, setEditPages] = useState<string[]>(getDefaultPagesByRole('data_entry'))
  const [createPages, setCreatePages] = useState<string[]>(getDefaultPagesByRole('data_entry'))
  const [editRole, setEditRole] = useState<string>('data_entry')
  const [createRole, setCreateRole] = useState<string>('data_entry')
  const [editCanViewCosts, setEditCanViewCosts] = useState<boolean>(true)
  const [createCanViewCosts, setCreateCanViewCosts] = useState<boolean>(false)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterRole, setFilterRole] = useState("all")
  const [filterBranch, setFilterBranch] = useState("all")
  const [showPassword, setShowPassword] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deletingEmp, setDeletingEmp] = useState<Profile | null>(null)

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
    } else if (errorMsg.includes("profiles_branch_logic_check") || errorMsg.includes("profiles_role_check")) {
      friendlyMessage = "ฐานข้อมูลติดกฎข้อจำกัด (profiles_branch_logic_check) สำหรับตำแหน่งใหม่ กรุณานำคำสั่งในไฟล์ supabase_migration_employee_roles_and_branches.sql ไปรันใน Supabase SQL Editor";
    } else if (errorMsg.includes("profiles_phone_uidx") || (errorMsg.includes("duplicate key") && errorMsg.includes("phone"))) {
      friendlyMessage = "เบอร์โทรศัพท์นี้ถูกใช้ไปแล้วโดยผู้ใช้อื่นในระบบ (หากไม่มีเบอร์เฉพาะตัว สามารถเว้นว่างไว้ได้ครับ ไม่จำเป็นต้องกรอก)";
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

  const openEditModal = (emp: Profile) => {
    setEditingEmp(emp)
    const r = emp.role || 'data_entry'
    setEditRole(r)
    const cats = (emp.allowed_inventory_tabs && emp.allowed_inventory_tabs.length > 0)
      ? emp.allowed_inventory_tabs
      : ['SLABS', 'ROUGH', 'PROP', 'FURNITURE']
    setEditCategories(cats)
    const rawPages = (emp.allowed_pages && emp.allowed_pages.length > 0)
      ? emp.allowed_pages
      : getDefaultPagesByRole(r)
    const pages = rawPages.map(p => p === '/manager/gallery' ? '/gallery' : p)
    setEditPages(pages)
    if (emp.can_view_costs !== undefined && emp.can_view_costs !== null) {
      setEditCanViewCosts(emp.can_view_costs)
    } else {
      setEditCanViewCosts(['admin', 'manager', 'data_analyst'].includes(r))
    }
    setIsModalOpen(true)
  }

  const openCreateModal = () => {
    setCreateRole('data_entry')
    setCreateCategories(['SLABS', 'ROUGH', 'PROP', 'FURNITURE'])
    setCreatePages(getDefaultPagesByRole('data_entry'))
    setCreateCanViewCosts(false)
    setShowPassword(false)
    setIsCreateModalOpen(true)
  }

  const getRoleInfo = (role: string) => ROLE_CONFIG[role] || {
    label: role || "Staff",
    labelTh: role || "พนักงาน",
    color: "text-slate-600",
    bg: "bg-slate-50",
    border: "border-slate-200",
    dot: "bg-slate-400",
    Icon: User
  }

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
                <p className="text-slate-500 text-sm mt-0.5">บริหารจัดการข้อมูลและกำหนดสิทธิ์หมวดหมู่สินค้าในคลัง</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMatrixModalOpen(true)}
              className="bg-white border border-slate-200 hover:bg-slate-50 hover:border-indigo-300 text-slate-700 px-5 py-3 rounded-2xl shadow-sm transition-all flex items-center gap-2.5 font-bold active:scale-[0.97] text-sm group"
            >
              <Shield className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
              ผังสิทธิ์การกรอง (Permission Matrix)
            </button>
            <button
              onClick={openCreateModal}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-2xl shadow-lg shadow-blue-300/40 transition-all flex items-center gap-2.5 font-bold active:scale-[0.97] text-sm group"
            >
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition">
                <UserPlus className="w-4 h-4" />
              </div>
              เพิ่มพนักงานใหม่
            </button>
          </div>
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
        {Object.entries(ROLE_CONFIG).filter(([key]) => key !== 'unassigned').map(([key, cfg]) => {
          const RoleIcon = cfg.Icon;
          return (
            <div
              key={key}
              className={`${cfg.bg} ${cfg.border} border rounded-2xl p-4 relative overflow-hidden hover:shadow-md transition-all duration-300 cursor-default group`}
            >
              {RoleIcon && (
                <div className={`absolute top-3 right-3 ${cfg.color} opacity-40 group-hover:scale-110 transition-transform`}>
                  <RoleIcon className="w-5 h-5" />
                </div>
              )}
              <p className={`text-[10px] font-bold uppercase tracking-wider ${cfg.color} opacity-70`}>{cfg.label}</p>
              <p className={`text-2xl font-black mt-1 ${cfg.color}`}>{stats.roleCounts[key] || 0}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{cfg.labelTh}</p>
            </div>
          );
        })}
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
              <option value="admin">Admin (ผู้ดูแลระบบ)</option>
              <option value="data_entry">Data Entry (บันทึกข้อมูลสินค้า)</option>
              <option value="data_analyst">Data Analyst (นักวิเคราะห์ข้อมูล)</option>
              <option value="manager">Manager (ผู้จัดการ)</option>
              <option value="warehouse">Warehouse (คลังสินค้า)</option>
              <option value="sale">Sale (พนักงานขาย)</option>
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
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">หน้าเมนูที่เข้าถึงได้</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">หมวดสินค้าที่รับผิดชอบ</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">สิทธิ์ดูต้นทุน</th>
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
                const RoleBadgeIcon = roleInfo.Icon;
                const assignedCats = (emp.allowed_inventory_tabs && emp.allowed_inventory_tabs.length > 0)
                  ? emp.allowed_inventory_tabs
                  : ['SLABS', 'ROUGH', 'PROP', 'FURNITURE'];
                const rawAssignedPages = (emp.allowed_pages && emp.allowed_pages.length > 0)
                  ? emp.allowed_pages
                  : getDefaultPagesByRole(emp.role);
                const assignedPages = rawAssignedPages.map(p => p === '/manager/gallery' ? '/gallery' : p);

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
                        {RoleBadgeIcon && <RoleBadgeIcon className="w-3.5 h-3.5" />}
                        {roleInfo.label}
                      </div>
                    </td>

                    {/* Allowed Pages */}
                    <td className="px-6 py-4">
                      {emp.role === 'sale' || emp.role === 'manager' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-violet-50 text-violet-700 border border-violet-200">
                          <Store className="w-3.5 h-3.5" /> ระบบหน้าร้าน ({emp.role === 'manager' ? 'Manager POS' : 'Sale POS'})
                        </span>
                      ) : assignedPages.length >= ALL_PAGE_HREFS.length ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <ShieldCheck className="w-3.5 h-3.5" /> เข้าถึงได้ทุกหน้า ({ALL_PAGE_HREFS.length} หน้า)
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-w-[250px]">
                          {assignedPages.slice(0, 4).map((href) => {
                            const pItem = PAGE_ITEMS.find(p => p.href === href);
                            const PageIcon = pItem?.Icon || FileText;
                            return (
                              <span
                                key={href}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200"
                                title={`${pItem?.label || href} (${href})`}
                              >
                                <PageIcon className="w-3 h-3 shrink-0" />
                                <span className="truncate max-w-[95px]">{pItem?.label || href}</span>
                              </span>
                            );
                          })}
                          {assignedPages.length > 4 && (
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200"
                              title={assignedPages.map(h => PAGE_ITEMS.find(p => p.href === h)?.label || h).join(', ')}
                            >
                              +{assignedPages.length - 4} หน้า
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Category permissions */}
                    <td className="px-6 py-4">
                      {emp.role === 'admin' || emp.role === 'data_analyst' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          <CheckCircle className="w-3.5 h-3.5" /> ดูแลครบทุกหมวด (All)
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                          {assignedCats.map((catId) => {
                            const cItem = CATEGORY_ITEMS.find(c => c.id === catId);
                            if (!cItem) return null;
                            const CatIcon = cItem.Icon;
                            return (
                              <span
                                key={catId}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${cItem.badgeBg}`}
                                title={cItem.label}
                              >
                                <CatIcon className="w-3 h-3 shrink-0" />
                                <span>{cItem.labelTh}</span>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </td>

                    {/* Cost Permission Badge */}
                    <td className="px-6 py-4">
                      {emp.can_view_costs !== false ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm" title="สามารถมองเห็นและจัดการต้นทุนสินค้าได้">
                          <DollarSign className="w-3.5 h-3.5" /> ดูต้นทุนได้
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200" title="ซ่อนข้อมูลต้นทุนและกำไรทั้งหมด">
                          <Lock className="w-3.5 h-3.5" /> ซ่อนต้นทุน
                        </span>
                      )}
                    </td>

                    {/* Branch */}
                    <td className="px-6 py-4">
                      {emp.role === 'admin' || emp.role === 'data_analyst' ? (
                        <span className="text-xs text-slate-400 italic font-medium flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5" /> All Branches
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
                          onClick={() => openEditModal(emp)}
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
                  <td colSpan={9} className="text-center py-16">
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
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]" style={{ animation: 'scaleIn 0.25s ease-out' }}>

            {/* Header */}
            <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md">
                  <Edit className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-800">แก้ไขข้อมูลและสิทธิ์พนักงาน</h2>
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
                      <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
                        <span>เบอร์โทรศัพท์</span>
                        <span className="text-[10px] text-slate-400 font-normal">ไม่บังคับ</span>
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                        <input name="phone" defaultValue={editingEmp.phone || ""} className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 outline-none transition bg-slate-50/30" placeholder="0xxxxxxxxx (เว้นว่างได้)" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
                        <span>วันเกิด</span>
                        <span className="text-[10px] text-slate-400 font-normal">ไม่บังคับ</span>
                      </label>
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
                    <Shield className="w-3 h-3" /> การจัดการสิทธิ์และหน้าที่
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1.5 block">ตำแหน่ง</label>
                      <select 
                        name="role" 
                        value={editRole}
                        onChange={(e) => {
                          const newR = e.target.value;
                          setEditRole(newR);
                          setEditPages(getDefaultPagesByRole(newR));
                        }}
                        className="w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 outline-none appearance-none cursor-pointer"
                      >
                        <option value="data_entry">Data Entry (เจ้าหน้าที่บันทึกข้อมูล)</option>
                        <option value="data_analyst">Data Analyst (นักวิเคราะห์ข้อมูล)</option>
                        <option value="sale">Sale (พนักงานขาย)</option>
                        <option value="manager">Manager (ผู้จัดการ)</option>
                        <option value="warehouse">Warehouse (คลังสินค้า)</option>
                        <option value="admin">Admin (ผู้ดูแลระบบ)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1.5 block">สาขา</label>
                      <select name="branch_id" defaultValue={editingEmp.branch_id || ""} className="w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 outline-none appearance-none cursor-pointer">
                        <option value="">-- ส่วนกลาง / ทุกสาขา --</option>
                        {branches.map(b => (
                          <option key={b.id} value={b.id}>{b.branch_name} ({b.branch_code})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* สิทธิ์การเข้าถึงหน้าเมนู (Allowed Pages) */}
                  <div className="pt-3 border-t border-blue-200/60 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Monitor className="w-3.5 h-3.5 text-indigo-600" /> หน้าที่อนุญาตให้เข้าใช้งาน (เมนู Sidebar)
                          <span className="px-2 py-0.5 text-[10px] rounded-full bg-indigo-100 text-indigo-700 font-extrabold">
                            เลือก {editPages.length}/{ALL_PAGE_HREFS.length} หน้า
                          </span>
                        </label>
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditPages(ALL_PAGE_HREFS)}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition"
                        >
                          เลือกทุกหน้า
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditPages(getDefaultPagesByRole(editRole))}
                          className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 border border-blue-200 transition"
                        >
                          ค่าเริ่มต้นตามตำแหน่ง
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditPages(['/inventory', '/stock-in', '/propsfina'])}
                          className="text-[10px] text-emerald-600 hover:text-emerald-800 font-semibold px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition"
                        >
                          เฉพาะคลังสินค้า
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      ติ๊กเลือกหน้าเมนูที่ต้องการให้แสดงในแถบเมนูด้านซ้าย (Sidebar) ของพนักงานคนนี้
                    </p>

                    {/* กลุ่ม 1: เมนูหลัก */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">เมนูหลัก (งานประจำวัน)</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {PAGE_ITEMS.filter(p => p.group === 'primary').map((page) => {
                          const isChecked = editPages.includes(page.href);
                          const PageIcon = page.Icon;
                          return (
                            <button
                              key={page.href}
                              type="button"
                              onClick={() => {
                                if (isChecked) {
                                  if (editPages.length > 1) setEditPages(editPages.filter(h => h !== page.href));
                                } else {
                                  setEditPages([...editPages, page.href]);
                                }
                              }}
                              className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all ${
                                isChecked
                                  ? 'border-indigo-300 bg-indigo-50/90 text-indigo-900 font-bold shadow-sm ring-1 ring-indigo-400/50'
                                  : 'border-slate-200 bg-white/70 text-slate-400 hover:bg-white hover:text-slate-600'
                              }`}
                            >
                              <PageIcon className="w-4 h-4 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] leading-tight truncate">{page.label}</p>
                                <p className="text-[9px] opacity-60 font-mono truncate">{page.href}</p>
                              </div>
                              <div className={`w-4 h-4 rounded flex items-center justify-center text-[10px] shrink-0 ${
                                isChecked ? 'bg-indigo-600 text-white font-bold' : 'border border-slate-300'
                              }`}>
                                {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* กลุ่ม 2: เมนูการจัดการ (Management) */}
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">เมนูการจัดการและรายงาน (Management)</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {PAGE_ITEMS.filter(p => p.group === 'secondary').map((page) => {
                          const isChecked = editPages.includes(page.href);
                          const PageIcon = page.Icon;
                          return (
                            <button
                              key={page.href}
                              type="button"
                              onClick={() => {
                                if (isChecked) {
                                  if (editPages.length > 1) setEditPages(editPages.filter(h => h !== page.href));
                                } else {
                                  setEditPages([...editPages, page.href]);
                                }
                              }}
                              className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all ${
                                isChecked
                                  ? 'border-blue-300 bg-blue-50/90 text-blue-900 font-bold shadow-sm ring-1 ring-blue-400/50'
                                  : 'border-slate-200 bg-white/70 text-slate-400 hover:bg-white hover:text-slate-600'
                              }`}
                            >
                              <PageIcon className="w-4 h-4 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] leading-tight truncate">{page.label}</p>
                                <p className="text-[9px] opacity-60 font-mono truncate">{page.href}</p>
                              </div>
                              <div className={`w-4 h-4 rounded flex items-center justify-center text-[10px] shrink-0 ${
                                isChecked ? 'bg-blue-600 text-white font-bold' : 'border border-slate-300'
                              }`}>
                                {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <input 
                      type="hidden" 
                      name="allowed_pages" 
                      value={JSON.stringify(
                        editPages.includes('/gallery') && !editPages.includes('/manager/gallery')
                          ? [...editPages, '/manager/gallery']
                          : editPages
                      )} 
                    />
                  </div>

                  {/* หมวดหมู่สินค้าที่รับผิดชอบในคลัง */}
                  <div className="pt-3 border-t border-blue-200/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-blue-600" /> หมวดสินค้าที่รับผิดชอบ (/inventory)
                      </label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditCategories(['SLABS', 'ROUGH', 'PROP', 'FURNITURE'])}
                          className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold px-2 py-0.5 rounded bg-blue-50/80 hover:bg-blue-100 border border-blue-200 transition"
                        >
                          ทุกหมวด
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditCategories(['ROUGH'])}
                          className="text-[10px] text-orange-600 hover:text-orange-800 font-semibold px-2 py-0.5 rounded bg-orange-50/80 hover:bg-orange-100 border border-orange-200 transition"
                        >
                          ไม้ดิบ
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditCategories(['SLABS'])}
                          className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold px-2 py-0.5 rounded bg-blue-50/80 hover:bg-blue-100 border border-blue-200 transition"
                        >
                          แผ่นไม้
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditCategories(['PROP', 'FURNITURE'])}
                          className="text-[10px] text-purple-600 hover:text-purple-800 font-semibold px-2 py-0.5 rounded bg-purple-50/80 hover:bg-purple-100 border border-purple-200 transition"
                        >
                          พร็อพ+เฟอร์
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      เมื่อพนักงานเข้าหน้าคลังสินค้า จะเห็นและคีย์ได้เฉพาะแท็บที่เลือกนี้เท่านั้น (แท็บอื่นจะถูกซ่อน)
                    </p>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {CATEGORY_ITEMS.map((cat) => {
                        const isChecked = editCategories.includes(cat.id);
                        const CatIcon = cat.Icon;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              if (isChecked) {
                                if (editCategories.length > 1) {
                                  setEditCategories(editCategories.filter(c => c !== cat.id));
                                }
                              } else {
                                setEditCategories([...editCategories, cat.id]);
                              }
                            }}
                            className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                              isChecked 
                                ? `${cat.color} font-bold shadow-sm ring-1 ring-blue-400`
                                : 'border-slate-200 bg-white/70 text-slate-400 hover:bg-white'
                            }`}
                          >
                            <CatIcon className="w-4 h-4 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs">{cat.labelTh}</p>
                              <p className="text-[10px] opacity-70 font-mono">{cat.id}</p>
                            </div>
                            <div className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] ${
                              isChecked ? 'bg-blue-600 text-white font-bold' : 'border border-slate-300'
                            }`}>
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <input type="hidden" name="allowed_inventory_tabs" value={JSON.stringify(editCategories)} />
                  </div>

                  {/* สิทธิ์การมองเห็นและจัดการต้นทุน (Cost Permission) */}
                  <div className="pt-3 border-t border-blue-200/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> สิทธิ์การดูและจัดการต้นทุนสินค้า
                        </label>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          ต้นทุนดอลลาร์, ต้นทุนรวมค่าส่ง (บาท) และกำไรในหน้าคลังสินค้า
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditCanViewCosts(!editCanViewCosts)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          editCanViewCosts ? 'bg-emerald-600' : 'bg-slate-300'
                        }`}
                        title={editCanViewCosts ? "คลิกเพื่อปิดสิทธิ์ดูต้นทุน" : "คลิกเพื่อเปิดสิทธิ์ดูต้นทุน"}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            editCanViewCosts ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                    <div className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 transition-all ${
                      editCanViewCosts 
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800' 
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}>
                      {editCanViewCosts ? (
                        <>
                          <Eye className="w-4 h-4 shrink-0 text-emerald-600" />
                          <span><strong>อนุญาตให้ดูต้นทุนได้:</strong> สามารถมองเห็นต้นทุน, คำนวณกำไร และอัปโหลดไฟล์ที่มีต้นทุนได้</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 shrink-0 text-slate-500" />
                          <span><strong>ซ่อนต้นทุน:</strong> ระบบจะซ่อนคอลัมน์ต้นทุนและกำไร และป้องกันไม่ให้เขียนทับต้นทุนเดิมในระบบ</span>
                        </>
                      )}
                    </div>
                    <input type="hidden" name="can_view_costs" value={editCanViewCosts ? 'true' : 'false'} />
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
      {/* CREATE MODAL */}
      {/* =================================================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" style={{ animation: 'fadeIn 0.2s ease-out' }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]" style={{ animation: 'scaleIn 0.25s ease-out' }}>

            {/* Header */}
            <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md">
                  <UserPlus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-800">เพิ่มพนักงานใหม่</h2>
                  <p className="text-[11px] text-slate-500">สร้างบัญชีผู้ใช้ กำหนดตำแหน่ง และเลือกหน้าเมนูที่อนุญาตให้เข้าใช้งาน</p>
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
                      <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
                        <span>เบอร์โทรศัพท์</span>
                        <span className="text-[10px] text-slate-400 font-normal">ไม่บังคับ</span>
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                        <input name="phone" className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 outline-none transition bg-slate-50/30" placeholder="0xxxxxxxxx (เว้นว่างได้)" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
                        <span>วันเกิด</span>
                        <span className="text-[10px] text-slate-400 font-normal">ไม่บังคับ</span>
                      </label>
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
                      <select 
                        name="role" 
                        value={createRole}
                        onChange={(e) => {
                          const newR = e.target.value;
                          setCreateRole(newR);
                          setCreatePages(getDefaultPagesByRole(newR));
                          setCreateCanViewCosts(['admin', 'manager', 'data_analyst'].includes(newR));
                        }}
                        className="w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 outline-none appearance-none cursor-pointer"
                      >
                        <option value="data_entry">Data Entry (เจ้าหน้าที่บันทึกข้อมูล)</option>
                        <option value="data_analyst">Data Analyst (นักวิเคราะห์ข้อมูล)</option>
                        <option value="sale">Sale (พนักงานขาย)</option>
                        <option value="manager">Manager (ผู้จัดการ)</option>
                        <option value="warehouse">Warehouse (คลังสินค้า)</option>
                        <option value="admin">Admin (ผู้ดูแลระบบ)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1.5 block">สาขา</label>
                      <select name="branch_id" className="w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 outline-none appearance-none cursor-pointer">
                        <option value="">-- ส่วนกลาง / ทุกสาขา --</option>
                        {branches.map(b => (
                          <option key={b.id} value={b.id}>{b.branch_name} ({b.branch_code})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* สิทธิ์การเข้าถึงหน้าเมนู (Allowed Pages) */}
                  <div className="pt-3 border-t border-blue-200/60 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Monitor className="w-3.5 h-3.5 text-indigo-600" /> หน้าที่อนุญาตให้เข้าใช้งาน (เมนู Sidebar)
                          <span className="px-2 py-0.5 text-[10px] rounded-full bg-indigo-100 text-indigo-700 font-extrabold">
                            เลือก {createPages.length}/{ALL_PAGE_HREFS.length} หน้า
                          </span>
                        </label>
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setCreatePages(ALL_PAGE_HREFS)}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition"
                        >
                          เลือกทุกหน้า
                        </button>
                        <button
                          type="button"
                          onClick={() => setCreatePages(getDefaultPagesByRole(createRole))}
                          className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 border border-blue-200 transition"
                        >
                          ค่าเริ่มต้นตามตำแหน่ง
                        </button>
                        <button
                          type="button"
                          onClick={() => setCreatePages(['/inventory', '/stock-in', '/propsfina'])}
                          className="text-[10px] text-emerald-600 hover:text-emerald-800 font-semibold px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition"
                        >
                          เฉพาะคลังสินค้า
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      ติ๊กเลือกหน้าเมนูที่ต้องการให้แสดงในแถบเมนูด้านซ้าย (Sidebar) ของพนักงานคนนี้
                    </p>

                    {/* กลุ่ม 1: เมนูหลัก */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">เมนูหลัก (งานประจำวัน)</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {PAGE_ITEMS.filter(p => p.group === 'primary').map((page) => {
                          const isChecked = createPages.includes(page.href);
                          const PageIcon = page.Icon;
                          return (
                            <button
                              key={page.href}
                              type="button"
                              onClick={() => {
                                if (isChecked) {
                                  if (createPages.length > 1) setCreatePages(createPages.filter(h => h !== page.href));
                                } else {
                                  setCreatePages([...createPages, page.href]);
                                }
                              }}
                              className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all ${
                                isChecked
                                  ? 'border-indigo-300 bg-indigo-50/90 text-indigo-900 font-bold shadow-sm ring-1 ring-indigo-400/50'
                                  : 'border-slate-200 bg-white/70 text-slate-400 hover:bg-white hover:text-slate-600'
                              }`}
                            >
                              <PageIcon className="w-4 h-4 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] leading-tight truncate">{page.label}</p>
                                <p className="text-[9px] opacity-60 font-mono truncate">{page.href}</p>
                              </div>
                              <div className={`w-4 h-4 rounded flex items-center justify-center text-[10px] shrink-0 ${
                                isChecked ? 'bg-indigo-600 text-white font-bold' : 'border border-slate-300'
                              }`}>
                                {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* กลุ่ม 2: เมนูการจัดการ (Management) */}
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">เมนูการจัดการและรายงาน (Management)</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {PAGE_ITEMS.filter(p => p.group === 'secondary').map((page) => {
                          const isChecked = createPages.includes(page.href);
                          const PageIcon = page.Icon;
                          return (
                            <button
                              key={page.href}
                              type="button"
                              onClick={() => {
                                if (isChecked) {
                                  if (createPages.length > 1) setCreatePages(createPages.filter(h => h !== page.href));
                                } else {
                                  setCreatePages([...createPages, page.href]);
                                }
                              }}
                              className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all ${
                                isChecked
                                  ? 'border-blue-300 bg-blue-50/90 text-blue-900 font-bold shadow-sm ring-1 ring-blue-400/50'
                                  : 'border-slate-200 bg-white/70 text-slate-400 hover:bg-white hover:text-slate-600'
                              }`}
                            >
                              <PageIcon className="w-4 h-4 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] leading-tight truncate">{page.label}</p>
                                <p className="text-[9px] opacity-60 font-mono truncate">{page.href}</p>
                              </div>
                              <div className={`w-4 h-4 rounded flex items-center justify-center text-[10px] shrink-0 ${
                                isChecked ? 'bg-blue-600 text-white font-bold' : 'border border-slate-300'
                              }`}>
                                {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <input 
                      type="hidden" 
                      name="allowed_pages" 
                      value={JSON.stringify(
                        createPages.includes('/gallery') && !createPages.includes('/manager/gallery')
                          ? [...createPages, '/manager/gallery']
                          : createPages
                      )} 
                    />
                  </div>

                  {/* หมวดหมู่สินค้าที่รับผิดชอบในคลัง */}
                  <div className="pt-3 border-t border-blue-200/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-blue-600" /> หมวดสินค้าที่รับผิดชอบ (/inventory)
                      </label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setCreateCategories(['SLABS', 'ROUGH', 'PROP', 'FURNITURE'])}
                          className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold px-2 py-0.5 rounded bg-blue-50/80 hover:bg-blue-100 border border-blue-200 transition"
                        >
                          ทุกหมวด
                        </button>
                        <button
                          type="button"
                          onClick={() => setCreateCategories(['ROUGH'])}
                          className="text-[10px] text-orange-600 hover:text-orange-800 font-semibold px-2 py-0.5 rounded bg-orange-50/80 hover:bg-orange-100 border border-orange-200 transition"
                        >
                          ไม้ดิบ
                        </button>
                        <button
                          type="button"
                          onClick={() => setCreateCategories(['SLABS'])}
                          className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold px-2 py-0.5 rounded bg-blue-50/80 hover:bg-blue-100 border border-blue-200 transition"
                        >
                          แผ่นไม้
                        </button>
                        <button
                          type="button"
                          onClick={() => setCreateCategories(['PROP', 'FURNITURE'])}
                          className="text-[10px] text-purple-600 hover:text-purple-800 font-semibold px-2 py-0.5 rounded bg-purple-50/80 hover:bg-purple-100 border border-purple-200 transition"
                        >
                          พร็อพ+เฟอร์
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      เมื่อพนักงานเข้าหน้าคลังสินค้า จะเห็นและคีย์ได้เฉพาะแท็บที่เลือกนี้เท่านั้น (แท็บอื่นจะถูกซ่อน)
                    </p>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {CATEGORY_ITEMS.map((cat) => {
                        const isChecked = createCategories.includes(cat.id);
                        const CatIcon = cat.Icon;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              if (isChecked) {
                                if (createCategories.length > 1) {
                                  setCreateCategories(createCategories.filter(c => c !== cat.id));
                                }
                              } else {
                                setCreateCategories([...createCategories, cat.id]);
                              }
                            }}
                            className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                              isChecked 
                                ? `${cat.color} font-bold shadow-sm ring-1 ring-blue-400`
                                : 'border-slate-200 bg-white/70 text-slate-400 hover:bg-white'
                            }`}
                          >
                            <CatIcon className="w-4 h-4 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs">{cat.labelTh}</p>
                              <p className="text-[10px] opacity-70 font-mono">{cat.id}</p>
                            </div>
                            <div className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] ${
                              isChecked ? 'bg-blue-600 text-white font-bold' : 'border border-slate-300'
                            }`}>
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <input type="hidden" name="allowed_inventory_tabs" value={JSON.stringify(createCategories)} />
                  </div>

                  {/* สิทธิ์การมองเห็นและจัดการต้นทุน (Cost Permission) */}
                  <div className="pt-3 border-t border-blue-200/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> สิทธิ์การดูและจัดการต้นทุนสินค้า
                        </label>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          ต้นทุนดอลลาร์, ต้นทุนรวมค่าส่ง (บาท) และกำไรในหน้าคลังสินค้า
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCreateCanViewCosts(!createCanViewCosts)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          createCanViewCosts ? 'bg-emerald-600' : 'bg-slate-300'
                        }`}
                        title={createCanViewCosts ? "คลิกเพื่อปิดสิทธิ์ดูต้นทุน" : "คลิกเพื่อเปิดสิทธิ์ดูต้นทุน"}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            createCanViewCosts ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                    <div className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 transition-all ${
                      createCanViewCosts 
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800' 
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}>
                      {createCanViewCosts ? (
                        <>
                          <Eye className="w-4 h-4 shrink-0 text-emerald-600" />
                          <span><strong>อนุญาตให้ดูต้นทุนได้:</strong> สามารถมองเห็นต้นทุน, คำนวณกำไร และอัปโหลดไฟล์ที่มีต้นทุนได้</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 shrink-0 text-slate-500" />
                          <span><strong>ซ่อนต้นทุน:</strong> ระบบจะซ่อนคอลัมน์ต้นทุนและกำไร และป้องกันไม่ให้เขียนทับต้นทุนเดิมในระบบ</span>
                        </>
                      )}
                    </div>
                    <input type="hidden" name="can_view_costs" value={createCanViewCosts ? 'true' : 'false'} />
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

      {/* =================================================================================== */}
      {/* PERMISSION MATRIX MODAL */}
      {/* =================================================================================== */}
      {isMatrixModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto" style={{ animation: 'fadeIn 0.2s ease-out' }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col my-8 max-h-[90vh]" style={{ animation: 'scaleIn 0.25s ease-out' }}>

            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50/70 via-blue-50/50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center shadow-md text-white">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                    ผังสิทธิ์และการกรองในระบบ (Role & Permission Matrix)
                  </h2>
                  <p className="text-[12px] text-slate-500">ตารางแจกแจงสิทธิ์การเข้าถึง และการกรองข้อมูลสินค้าตามตำแหน่งงาน</p>
                </div>
              </div>
              <button 
                onClick={() => setIsMatrixModalOpen(false)} 
                className="p-2 hover:bg-slate-200/50 rounded-xl transition active:scale-90"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto p-6 space-y-6">

              {/* 1. สรุปตำแหน่งงานหลัก */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" /> สรุปหน้าที่ตามตำแหน่ง (Role Overview)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* Data Entry */}
                  <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/40 space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-amber-700" />
                      <div>
                        <p className="font-extrabold text-sm text-amber-900">Data Entry</p>
                        <p className="text-[11px] text-amber-700">เจ้าหน้าที่บันทึกข้อมูลสินค้า</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      เข้าหน้า <strong>/inventory</strong> ได้เฉพาะหมวดที่ได้รับมอบหมาย เช่น คีย์เฉพาะไม้ดิบ, เฉพาะแผ่นไม้, หรือเฉพาะพร็อพ (ซ่อนหมวดอื่นเด็ดขาดและซ่อนเมนูระบบ)
                    </p>
                  </div>

                  {/* Data Analyst */}
                  <div className="p-4 rounded-2xl border border-indigo-200 bg-indigo-50/40 space-y-2">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-indigo-700" />
                      <div>
                        <p className="font-extrabold text-sm text-indigo-900">Data Analyst</p>
                        <p className="text-[11px] text-indigo-700">นักวิเคราะห์ข้อมูล</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      ดูแดชบอร์ด, รายงานยอดขาย, ประวัติการขาย, อัลกอริทึม, และสินค้าครบทั้ง 4 หมวดเพื่อวิเคราะห์ข้อมูล (ซ่อนปุ่มลบ/แก้ไขระบบหลัก)
                    </p>
                  </div>

                  {/* Admin */}
                  <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/40 space-y-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-rose-700" />
                      <div>
                        <p className="font-extrabold text-sm text-rose-900">Admin</p>
                        <p className="text-[11px] text-rose-700">ผู้ดูแลระบบสูงสุด</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      เข้าถึงได้ทุกหน้า ทุกสาขา ดูแลสินค้าครบทั้ง 4 หมวด จัดการพนักงาน ตั้งค่าระบบ และกู้คืนข้อมูล
                    </p>
                  </div>

                  {/* Manager */}
                  <div className="p-4 rounded-2xl border border-violet-200 bg-violet-50/40 space-y-2">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-violet-700" />
                      <div>
                        <p className="font-extrabold text-sm text-violet-900">Manager</p>
                        <p className="text-[11px] text-violet-700">ผู้จัดการสาขา</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      จัดการหน้าร้าน POS, ตรวจสอบสต็อก, จัดการพนักงาน และดูรายงานยอดขายเฉพาะสาขาของตนเอง
                    </p>
                  </div>

                  {/* Sale */}
                  <div className="p-4 rounded-2xl border border-sky-200 bg-sky-50/40 space-y-2">
                    <div className="flex items-center gap-2">
                      <Tag className="w-5 h-5 text-sky-700" />
                      <div>
                        <p className="font-extrabold text-sm text-sky-900">Sale</p>
                        <p className="text-[11px] text-sky-700">พนักงานขายหน้าร้าน</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      ขายสินค้าหน้าร้านผ่านระบบ POS และเชื่อมต่อ Mobile RFID ประจำสาขา
                    </p>
                  </div>

                  {/* Warehouse */}
                  <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-2">
                    <div className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-emerald-700" />
                      <div>
                        <p className="font-extrabold text-sm text-emerald-900">Warehouse</p>
                        <p className="text-[11px] text-emerald-700">คลังสินค้า</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      ตรวจรับสินค้าเข้าคลัง จัดการลอตสินค้า และดูแลสินค้าตามหมวดหมู่ที่ได้รับมอบหมาย
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. ผังการกรองในหน้าคลังสินค้า */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5" /> ตัวอย่างการกรองสินค้าในหน้าคลัง (/inventory)
                </h3>
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <th className="p-3 font-bold">ตำแหน่งงาน</th>
                        <th className="p-3 font-bold">หมวดที่ติ๊กเลือก</th>
                        <th className="p-3 font-bold text-center">แผ่นไม้</th>
                        <th className="p-3 font-bold text-center">ไม้ดิบ</th>
                        <th className="p-3 font-bold text-center">พร็อพ</th>
                        <th className="p-3 font-bold text-center">เฟอร์ฯ</th>
                        <th className="p-3 font-bold">ผลลัพธ์ในหน้า /inventory</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr className="hover:bg-amber-50/30">
                        <td className="p-3 font-bold text-amber-800">Data Entry (คีย์ไม้ดิบ)</td>
                        <td className="p-3"><span className="px-2 py-0.5 rounded bg-orange-100 text-orange-800 font-bold border border-orange-200">ไม้ดิบ (ROUGH)</span></td>
                        <td className="p-3 text-center text-slate-300">ซ่อน</td>
                        <td className="p-3 text-center text-emerald-600 font-bold">แสดง</td>
                        <td className="p-3 text-center text-slate-300">ซ่อน</td>
                        <td className="p-3 text-center text-slate-300">ซ่อน</td>
                        <td className="p-3 text-slate-600">เห็นและจัดการได้เฉพาะแท็บ Rough Wood เท่านั้น</td>
                      </tr>
                      <tr className="hover:bg-amber-50/30">
                        <td className="p-3 font-bold text-amber-800">Data Entry (คีย์แผ่นไม้)</td>
                        <td className="p-3"><span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold border border-blue-200">แผ่นไม้ (SLABS)</span></td>
                        <td className="p-3 text-center text-emerald-600 font-bold">แสดง</td>
                        <td className="p-3 text-center text-slate-300">ซ่อน</td>
                        <td className="p-3 text-center text-slate-300">ซ่อน</td>
                        <td className="p-3 text-center text-slate-300">ซ่อน</td>
                        <td className="p-3 text-slate-600">เห็นและจัดการได้เฉพาะแท็บ Wood Slabs เท่านั้น</td>
                      </tr>
                      <tr className="hover:bg-amber-50/30">
                        <td className="p-3 font-bold text-amber-800">Data Entry (พร็อพ & เฟอร์)</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold border border-purple-200 mr-1">พร็อพ</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">เฟอร์ฯ</span>
                        </td>
                        <td className="p-3 text-center text-slate-300">ซ่อน</td>
                        <td className="p-3 text-center text-slate-300">ซ่อน</td>
                        <td className="p-3 text-center text-emerald-600 font-bold">แสดง</td>
                        <td className="p-3 text-center text-emerald-600 font-bold">แสดง</td>
                        <td className="p-3 text-slate-600">สลับดูได้ 2 แท็บ (Props & Furniture)</td>
                      </tr>
                      <tr className="hover:bg-indigo-50/30 bg-indigo-50/10">
                        <td className="p-3 font-bold text-indigo-800">Data Analyst</td>
                        <td className="p-3"><span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold border border-slate-200">อัตโนมัติครบทุกหมวด</span></td>
                        <td className="p-3 text-center text-emerald-600 font-bold">แสดง</td>
                        <td className="p-3 text-center text-emerald-600 font-bold">แสดง</td>
                        <td className="p-3 text-center text-emerald-600 font-bold">แสดง</td>
                        <td className="p-3 text-center text-emerald-600 font-bold">แสดง</td>
                        <td className="p-3 text-slate-600">เห็นครบทั้ง 4 หมวด เพื่อใช้วิเคราะห์และดูข้อมูล</td>
                      </tr>
                      <tr className="hover:bg-rose-50/30 bg-rose-50/10">
                        <td className="p-3 font-bold text-rose-800">Admin</td>
                        <td className="p-3"><span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold border border-rose-200">สิทธิ์เต็มทุกหมวด</span></td>
                        <td className="p-3 text-center text-emerald-600 font-bold">แสดง</td>
                        <td className="p-3 text-center text-emerald-600 font-bold">แสดง</td>
                        <td className="p-3 text-center text-emerald-600 font-bold">แสดง</td>
                        <td className="p-3 text-center text-emerald-600 font-bold">แสดง</td>
                        <td className="p-3 text-slate-600">เห็นและจัดการได้ครบทุกหมวดหมู่และทุกระบบ</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. การควบคุมสิทธิ์การมองเห็นต้นทุน (Cost Visibility Protection) */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" /> การควบคุมสิทธิ์การมองเห็นต้นทุน (Cost Visibility & Protection)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-emerald-700" />
                      <p className="font-bold text-sm text-emerald-900">ดูต้นทุนได้ (เปิดสิทธิ์)</p>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      เห็นคอลัมน์ต้นทุนดอลลาร์, ต้นทุนรวมค่าส่ง (บาท) และผลกำไร ในหน้าคลังสินค้า สามารถดาวน์โหลดเทมเพลตและอัปเดตข้อมูลต้นทุนผ่านไฟล์ Excel ได้
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/80 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-slate-600" />
                      <p className="font-bold text-sm text-slate-800">ซ่อนต้นทุน (ปิดสิทธิ์ - Smart Protect)</p>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      ซ่อนคอลัมน์ต้นทุนและตัวเลขกำไรทั้งหมด หากนำเข้าไฟล์ Excel ระบบจะ<strong>รักษาต้นทุนเดิมในฐานข้อมูลไว้เสมอ</strong> ไม่เขียนทับเป็น 0 และไม่แสดงข้อมูลต้นทุนในเทมเพลต
                    </p>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsMatrixModalOpen(false)}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-sm transition shadow-sm"
              >
                เข้าใจแล้ว / ปิดหน้าต่าง
              </button>
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