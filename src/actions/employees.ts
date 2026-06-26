// src/actions/employees.ts
"use server"

import { createClient } from "../lib/supabase/server";
import { supabaseAdmin } from "../lib/supabase/admin";
import { revalidatePath } from "next/cache";

const TABLE_PROFILES = 'profiles'

// --- Types ---
export interface Employee {
  user_id: string
  full_name: string
  role: string
  phone: string | null
  citizen_id: string | null
  birth_date: string | null
  avatar_url: string | null
  branch_id: number | null
  created_at: string
}

// --- Helper: Check Auth & Get Profile ---
export async function getUserProfile() {
  const supabase = await createClient()
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error("Unauthorized")

    const { data: pf, error: dbError } = await supabase
      .from("profiles")
      .select("branch_id, full_name, role, branches(branch_name)")
      .eq("user_id", user.id)
      .single()

    if (dbError) throw new Error(dbError.message)

    return { 
      user: { id: user.id, email: user.email }, 
      profile: {
        branch_id: pf.branch_id || null,
        // @ts-ignore
        branch_name: pf.branches?.branch_name || "Unknown Branch",
        full_name: pf.full_name || user.email,
        role: pf.role 
      }, 
      error: null 
    }
  } catch (err: any) {
    return { user: null, profile: null, error: err.message }
  }
}

// --- Functions ---

// 1. ดึงพนักงานตามสาขา (สำหรับ Manager)
export async function getEmployeesByBranch(branchId: number) {
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    // Security Check
    const { data: requester } = await supabase
      .from('profiles')
      .select('role, branch_id')
      .eq('user_id', user.id)
      .single()

    if (requester?.role !== 'admin' && requester?.branch_id !== branchId) {
       throw new Error("Access Denied: You can only view employees in your branch.")
    }

    const { data, error } = await supabase
      .from(TABLE_PROFILES)
      .select('*')
      .eq('branch_id', branchId)
      .order('role', { ascending: true })

    if (error) throw new Error(error.message)

    return { data: data as Employee[], error: null }

  } catch (err: any) {
    console.error("Get Employees Error:", err.message)
    return { data: [], error: err.message }
  }
}

// 2. อัปเดตข้อมูลพนักงาน
export async function updateEmployee(formData: FormData) {
  try {
    const userId = formData.get('user_id') as string
    const role = formData.get('role') as string
    const branchId = formData.get('branch_id')
    const fullName = formData.get('full_name') as string
    const phone = formData.get('phone') as string
    const birthDate = formData.get('birth_date') as string

    // เช็ค Constraint Database
    if (role !== 'admin' && (!branchId || branchId === "")) {
      return { error: "ตำแหน่ง Sale/Manager/Warehouse ต้องระบุสาขา (ตามกฎ Database)" }
    }

    // เตรียมข้อมูล Update
    const profileData = {
        user_id: userId,
        full_name: fullName,
        role: role,
        branch_id: (branchId && branchId !== "") ? Number(branchId) : null,
        phone: phone || null,
        birth_date: birthDate || null
    }

    const { error } = await supabaseAdmin
      .from(TABLE_PROFILES)
      .upsert(profileData, { onConflict: 'user_id' })

    if (error) return { error: error.message }
    
    revalidatePath('/employees') 
    revalidatePath('/manager/employees') 
    return { success: true }
  } catch (err: any) {
    return { error: err.message || "เกิดข้อผิดพลาดในการอัปเดตข้อมูล" }
  }
}

// 3. ลบพนักงาน
export async function deleteEmployee(userId: string) {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
  
  if (error) return { error: error.message }
  
  revalidatePath('/employees')
  revalidatePath('/manager/employees')
  return { success: true }
}

// 4. สร้างพนักงานใหม่
export async function createEmployee(formData: FormData) {
  try {
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const fullName = formData.get('full_name') as string
    const role = formData.get('role') as string
    const branchId = formData.get('branch_id')
    const phone = formData.get('phone') as string
    const birthDate = formData.get('birth_date') as string

    // Validation
    if (!email || !password || !fullName) {
      return { error: "กรุณากรอก อีเมล, รหัสผ่าน และชื่อ-นามสกุล" }
    }
    
    // เช็ค Constraint Database
    if (role !== 'admin' && (!branchId || branchId === "")) {
      return { error: "ตำแหน่ง Sale/Manager/Warehouse ต้องระบุสาขา" }
    }

    // 1. สร้าง User ใน Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    })

    if (authError) return { error: "สร้างบัญชีไม่สำเร็จ: " + authError.message }
    if (!authData.user) return { error: "ไม่พบข้อมูล User ที่ถูกสร้าง" }

    // 2. สร้าง Profile ใน DB
    const { error: profileError } = await supabaseAdmin
      .from(TABLE_PROFILES)
      .upsert({ 
        user_id: authData.user.id,
        full_name: fullName,
        role: role,
        branch_id: (branchId && branchId !== "" && branchId !== "null") ? Number(branchId) : null,
        phone: phone || null,
        birth_date: birthDate || null
      }, { onConflict: 'user_id' })

    if (profileError) {
      // ถ้าสร้าง Profile พลาด -> ลบ User ทิ้งเพื่อความสะอาด
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return { error: "สร้างข้อมูลส่วนตัวไม่สำเร็จ: " + profileError.message }
    }
    
    revalidatePath('/employees') 
    revalidatePath('/manager/employees') 
    return { success: true }
  } catch (err: any) {
    return { error: err.message || "เกิดข้อผิดพลาดในการสร้างบัญชี" }
  }
}