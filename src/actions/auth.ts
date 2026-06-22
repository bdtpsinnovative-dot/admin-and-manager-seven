"use server";

import { createClient } from "../lib/supabase/server";
import { redirect } from "next/navigation";

/**
 * 1. ฟังก์ชันเข้าสู่ระบบ (Login)
 */
export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  try {
    // ส่งข้อมูลไปตรวจสอบกับ Supabase Auth
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Login Error:", error.message);
      
      // 🌟 แยกประเภท Error ให้ชัดเจน
      if (error.message.includes('fetch failed') || error.message.includes('network') || error.message.includes('EAI_AGAIN')) {
        return { error: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ โปรดตรวจสอบอินเทอร์เน็ตของคุณ" };
      }
      
      // ถ้าเป็น Error อื่นๆ จากระบบ Auth
      if (error.message.includes('Invalid login credentials')) {
        return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
      }

      // Error ที่ไม่ได้คาดคิด
      return { error: `เกิดข้อผิดพลาด: ${error.message}` };
    }

    // ✅ ถ้าล็อกอินสำเร็จ ส่ง success: true กลับไปให้ Client เปลี่ยนหน้าเอง
    return { success: true };

  } catch (err: any) {
    // จับ Error ระดับ Network ที่อาจทำให้ระบบพังไปเลย (Crash)
    console.error("Critical Login Error:", err);
    return { error: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ โปรดตรวจสอบอินเทอร์เน็ตของคุณ" };
  }
}

/**
 * 2. ฟังก์ชันออกจากระบบ (Logout)
 */
export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}