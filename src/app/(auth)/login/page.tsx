"use client"

import React, { useState, useEffect } from 'react'
import { 
  Eye, 
  EyeOff, 
  Plus, 
  X, 
  Loader2, 
  ShieldCheck, 
  Sparkles,
  UserPlus
} from 'lucide-react'

// ─────────────────────────────────────────────
// Types & Constants
// ─────────────────────────────────────────────
interface SavedAccount {
  email: string
  name: string
  role: string
  avatar_url?: string | null
  token_payload?: string
}

const STORAGE_KEY = 'wood_saved_accounts_v1'

function encodeCred(val: string): string {
  try { return btoa(encodeURIComponent(val)) } catch { return val }
}

function decodeCred(val: string): string {
  try { return decodeURIComponent(atob(val)) } catch { return val }
}

// DEFAULT_JAN ต้อง define หลัง encodeCred เสมอ
function makeDefaultJan(): SavedAccount {
  return {
    email: 'jan@gmail.com',
    name: 'แจน อิอิ',
    role: 'admin',
    avatar_url: 'https://zexflchjcycxrpjkuews.supabase.co/storage/v1/object/public/profiles/93fd4693-488b-484d-b481-bbccbb626350-1768983414399.webp',
    token_payload: encodeCred('123456')
  }
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([makeDefaultJan()])
  const [showAddModal, setShowAddModal] = useState(false)
  const [activeLoggingEmail, setActiveLoggingEmail] = useState<string | null>(null)

  // โหลด accounts จาก localStorage เมื่อ component mount บน client
  useEffect(() => {
    // ล้าง URL query / hash ที่ไม่จำเป็น (ความปลอดภัย)
    if (window.location.search || window.location.hash) {
      window.history.replaceState({}, '', window.location.pathname)
    }

    const DEFAULT_JAN = makeDefaultJan()
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      let accounts: SavedAccount[] = []
      if (raw) {
        try { accounts = JSON.parse(raw) } catch { accounts = [] }
      }

      // ต้องมีแจนเสมอ
      if (!accounts || accounts.length === 0) {
        accounts = [DEFAULT_JAN]
      } else if (!accounts.some(a => a.email.toLowerCase() === 'jan@gmail.com')) {
        accounts.unshift(DEFAULT_JAN)
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts))
      setSavedAccounts(accounts)
    } catch {
      setSavedAccounts([DEFAULT_JAN])
    }
  }, [])

  // บันทึกบัญชีใหม่ลง localStorage (สูงสุด 8 บัญชี)
  function persistAccount(acc: { email: string; name: string; role: string; avatar_url?: string | null; pass: string }) {
    const DEFAULT_JAN = makeDefaultJan()
    try {
      let current = [...savedAccounts]
      current = current.filter(a => a.email.toLowerCase() !== acc.email.toLowerCase())
      current.unshift({
        email: acc.email,
        name: acc.name,
        role: acc.role,
        avatar_url: acc.avatar_url,
        token_payload: encodeCred(acc.pass)
      })
      if (!current.some(a => a.email.toLowerCase() === 'jan@gmail.com')) {
        current.push(DEFAULT_JAN)
      }
      if (current.length > 8) current = current.slice(0, 8)
      setSavedAccounts(current)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
    } catch (e) {
      console.error('Error saving account:', e)
    }
  }

  // ลบบัญชีออกจากรายการ
  function handleRemoveAccount(e: React.MouseEvent, emailToRemove: string) {
    e.stopPropagation()
    const DEFAULT_JAN = makeDefaultJan()
    let updated = savedAccounts.filter(a => a.email.toLowerCase() !== emailToRemove.toLowerCase())
    if (updated.length === 0) updated = [DEFAULT_JAN]
    setSavedAccounts(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  // 1-Click Login
  async function handleOneClickLogin(account: SavedAccount) {
    if (loading) return
    setActiveLoggingEmail(account.email)
    setLoading(true)
    setError(null)

    const savedPass = account.token_payload ? decodeCred(account.token_payload) : ''

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: account.email, password: savedPass }),
      })
      const result = await res.json()

      if (!res.ok || result?.error) {
        setError(`${account.name}: ${result?.error || 'รหัสผ่านไม่ถูกต้อง กรุณาเพิ่มบัญชีใหม่'}`)
        setLoading(false)
        setActiveLoggingEmail(null)
        return
      }

      if (result?.success) {
        persistAccount({
          email: account.email,
          name: result.user?.full_name || account.name,
          role: result.role || account.role,
          avatar_url: result.user?.avatar_url || account.avatar_url,
          pass: savedPass
        })
        const role = result.role
        let targetUrl = '/dashboard'
        if (role === 'manager') targetUrl = '/manager/dashboard'
        else if (role === 'sale') targetUrl = '/sale/pos'
        window.location.href = targetUrl
      }
    } catch {
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้")
      setLoading(false)
      setActiveLoggingEmail(null)
    }
  }

  // Login ด้วยอีเมล+รหัสผ่านที่กรอกเอง
  async function handleAddLogin(e?: React.FormEvent, quickEmail?: string, quickPass?: string) {
    if (e) { e.preventDefault(); e.stopPropagation() }
    if (loading) return

    const targetEmail = (quickEmail || email).trim()
    const targetPassword = quickPass || password

    if (!targetEmail || !targetPassword) {
      setError('กรุณากรอกอีเมลและรหัสผ่าน')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, password: targetPassword }),
      })
      const result = await res.json()

      if (!res.ok || result?.error) {
        setError(result?.error || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง')
        setLoading(false)
        return
      }

      if (result?.success) {
        if (rememberMe) {
          persistAccount({
            email: targetEmail,
            name: result.user?.full_name || targetEmail,
            role: result.role || 'user',
            avatar_url: result.user?.avatar_url,
            pass: targetPassword
          })
        }
        const role = result.role
        let targetUrl = '/dashboard'
        if (role === 'manager') targetUrl = '/manager/dashboard'
        else if (role === 'sale') targetUrl = '/sale/pos'
        window.location.href = targetUrl
      }
    } catch {
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้")
      setLoading(false)
    }
  }

  const renderRoleBadge = (r: string) => {
    if (r === 'admin') return (
      <span className="inline-flex items-center gap-1 bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 border border-purple-200/80 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide">
        <Sparkles className="w-2.5 h-2.5 text-pink-500" /> Admin
      </span>
    )
    if (r === 'manager') return (
      <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200/80 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide">
        Manager
      </span>
    )
    if (r === 'sale') return (
      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide">
        Sales
      </span>
    )
    return (
      <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 border border-gray-200 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide">
        {r || 'พนักงาน'}
      </span>
    )
  }

  // ─── UI ─────────────────────────────────────
  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center p-4 sm:p-6 bg-[#fafafa] font-sans relative overflow-hidden">
      
      {/* Ambient glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-xs text-center border border-gray-100">
            <Loader2 className="w-10 h-10 text-[#0095f6] animate-spin mb-4" />
            <p className="text-[#262626] font-bold text-base">กำลังเข้าสู่ระบบ...</p>
            <p className="text-[#8e8e8e] text-xs mt-1">กรุณารอสักครู่</p>
          </div>
        </div>
      )}

      {/* Main container */}
      <div className="w-full max-w-[560px] relative z-10">

        {/* ── CARD: โปรไฟล์ ── */}
        <div className="bg-white border border-[#dbdbdb] rounded-2xl shadow-sm p-6 sm:p-8">

          {/* Header */}
          <div className="flex flex-col items-center mb-6">
            <img
              src="/logo.terra.home.png"
              alt="Terra Home Studio"
              className="h-12 sm:h-14 w-auto object-contain mb-3 drop-shadow-sm"
            />
            <h1 className="text-xl font-bold text-[#262626]">Wood Management</h1>
            <p className="text-xs text-[#8e8e8e] mt-1">เลือกโปรไฟล์เพื่อเข้าสู่ระบบทันที</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 text-xs font-medium flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Accounts Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">

            {savedAccounts.map((acc) => {
              const isActive = activeLoggingEmail === acc.email
              return (
                <div
                  key={acc.email}
                  onClick={() => handleOneClickLogin(acc)}
                  className={`group relative bg-white border rounded-2xl p-3 flex flex-col items-center text-center transition-all cursor-pointer select-none hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97] ${
                    isActive
                      ? 'border-[#A89880] ring-2 ring-[#A89880]/20 bg-[#faf8f5]'
                      : 'border-[#dbdbdb] hover:border-[#A89880]/60'
                  }`}
                >
                  {/* ปุ่ม X ลบ */}
                  <button
                    type="button"
                    onClick={(e) => handleRemoveAccount(e, acc.email)}
                    className="absolute top-2 right-2 w-5 h-5 rounded-full bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-500 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>

                  {/* Avatar + Story Ring */}
                  <div className="relative mb-2 mt-1">
                    <div className="p-[2.5px] rounded-full bg-gradient-to-tr from-[#C8BFB0] via-[#A89880] to-[#7B6A55] group-hover:scale-105 transition-transform">
                      <div className="p-[2px] bg-white rounded-full">
                        {acc.avatar_url ? (
                          <img
                            src={acc.avatar_url}
                            alt={acc.name}
                            className="w-14 h-14 rounded-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#C8BFB0] to-[#7B6A55] text-white flex items-center justify-center font-bold text-xl">
                            {acc.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Online dot */}
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#22c55e] border-2 border-white rounded-full" />
                  </div>

                  <p className="text-xs font-bold text-[#262626] truncate w-full group-hover:text-[#7B6A55] transition-colors">
                    {acc.name}
                  </p>
                  <div className="mt-0.5">
                    {renderRoleBadge(acc.role)}
                  </div>
                  <p className="text-[10px] text-[#8e8e8e] truncate w-full mt-0.5">{acc.email}</p>

                  <button
                    type="button"
                    className="mt-2.5 w-full py-1.5 bg-gradient-to-r from-[#A89880] to-[#7B6A55] group-hover:from-[#7B6A55] group-hover:to-[#5C4E3D] text-white text-[11px] font-semibold rounded-lg transition-all flex items-center justify-center shadow-sm"
                  >
                    {isActive ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'เข้าสู่ระบบ'}
                  </button>
                </div>
              )
            })}

            {/* การ์ด [+] เพิ่มบัญชีอื่น */}
            {savedAccounts.length < 8 && (
              <div
                onClick={() => { setError(null); setEmail(''); setPassword(''); setShowAddModal(true) }}
                className="border-2 border-dashed border-gray-300 hover:border-[#A89880] rounded-2xl p-3 flex flex-col items-center justify-center text-center cursor-pointer group bg-gray-50/50 hover:bg-[#faf8f5] hover:shadow-md transition-all active:scale-[0.97] min-h-[180px]"
              >
                <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-[#f0ece6] text-gray-400 group-hover:text-[#7B6A55] flex items-center justify-center mb-2 transition-colors">
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </div>
                <p className="text-xs font-bold text-gray-600 group-hover:text-[#7B6A55] transition-colors">เพิ่มบัญชีอื่น</p>
                <p className="text-[10px] text-gray-400 mt-0.5">เข้าด้วยอีเมลใหม่</p>
              </div>
            )}
          </div>
        </div>

        {/* ── CARD 2: ลิงก์เพิ่มบัญชี ── */}
        <div className="bg-white border border-[#dbdbdb] rounded-2xl p-4 text-center text-xs text-gray-500 mt-3 shadow-sm">
          ต้องการเพิ่มหรือสลับบัญชี?{' '}
          <button
            type="button"
            onClick={() => { setError(null); setEmail(''); setPassword(''); setShowAddModal(true) }}
            className="text-[#7B6A55] font-semibold hover:underline cursor-pointer"
          >
            คลิกเพื่อเพิ่มบัญชี
          </button>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-[10px] text-gray-400 uppercase tracking-wider">
          &copy; 2026 Wood Management · Terra Home · Secure One-Tap
        </p>
      </div>

      {/* ── MODAL: เพิ่มบัญชีใหม่ ── */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-full max-w-[400px] bg-white rounded-2xl shadow-2xl p-6 relative border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-5">
              <div className="inline-flex p-3 rounded-full bg-[#f0ece6] text-[#7B6A55] mb-2">
                <UserPlus className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-gray-900">เพิ่มบัญชีผู้ใช้งาน</h2>
              <p className="text-xs text-gray-400 mt-0.5">เข้าสู่ระบบเพื่อบันทึกบัญชีไว้ใช้ครั้งถัดไป</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 text-xs font-medium flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={(e) => handleAddLogin(e)} className="space-y-3">
              <input
                type="text"
                autoComplete="username"
                disabled={loading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#fafafa] border border-[#dbdbdb] focus:border-gray-400 focus:bg-white text-gray-900 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-gray-400 disabled:opacity-50"
                placeholder="อีเมล (เช่น sathon@gmail.com)"
              />

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  disabled={loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#fafafa] border border-[#dbdbdb] focus:border-gray-400 focus:bg-white text-gray-900 rounded-xl px-3.5 py-2.5 pr-10 text-sm outline-none transition-all placeholder:text-gray-400 disabled:opacity-50"
                  placeholder="รหัสผ่าน"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 accent-[#7B6A55]"
                />
                <span className="text-xs text-gray-600">บันทึกบัญชีนี้ไว้ในเครื่อง</span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-gradient-to-r from-[#A89880] to-[#7B6A55] hover:from-[#7B6A55] hover:to-[#5C4E3D] text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-[0.98] shadow-sm"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /><span>กำลังเข้าสู่ระบบ...</span></>
                  : 'เข้าสู่ระบบ'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}