import { NextResponse } from "next/server";

export function handleError(error: any) {
  console.error("API Error:", error);
  return NextResponse.json(
    { success: false, message: error.message || "Internal server error" },
    { status: error.status || 500 }
  );
}
