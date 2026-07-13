import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { MobileRfidService } from "@/api/mobile_rfid/service";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("system_settings")
      .select("*");
    if (error) throw error;

    // Convert array of settings [{ key, value }] into an object { [key]: value }
    const settings = (data || []).reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    return NextResponse.json({ success: true, settings });
  } catch (err: any) {
    console.error("Fetch system settings failed:", err.message);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const verifiedUser = await MobileRfidService.verifyToken(token);
    if (verifiedUser.role !== "admin") {
      return NextResponse.json({ success: false, message: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { key, value } = await req.json();
    if (!key || value === undefined) {
      return NextResponse.json({ success: false, message: "Missing key or value" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("system_settings")
      .upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) throw error;

    return NextResponse.json({ success: true, message: `System setting '${key}' updated successfully` });
  } catch (err: any) {
    console.error("Update system settings failed:", err.message);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
