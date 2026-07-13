import { NextRequest, NextResponse } from "next/server";

export async function handleProxyRequest(
  request: NextRequest,
  params: { path: string[] }
) {
  try {
    const { path } = params;
    const subpath = path.join("/");
    
    // Extract query parameters
    const searchParams = request.nextUrl.searchParams.toString();
    
    // Load config from env
    const upstreamBase = process.env.MOBILE_RFID_UPSTREAM_BASE_URL || process.env.SUPABASE_URL;
    const anonKey = process.env.MOBILE_RFID_API_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!upstreamBase || !anonKey) {
      return NextResponse.json(
        { success: false, message: "Backend environment variables are not configured properly." },
        { status: 500 }
      );
    }
    
    // Construct final upstream URL
    const cleanBase = upstreamBase.endsWith("/") ? upstreamBase.slice(0, -1) : upstreamBase;
    const cleanSubpath = subpath.startsWith("/") ? subpath.slice(1) : subpath;
    const upstreamUrl = `${cleanBase}/${cleanSubpath}${searchParams ? `?${searchParams}` : ""}`;
    
    // Construct request headers
    const headers = new Headers();
    request.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (lowerKey !== "host" && lowerKey !== "content-length" && lowerKey !== "connection") {
        headers.set(key, value);
      }
    });
    
    // Force backend secrets
    headers.set("apikey", anonKey);
    
    const incomingAuth = request.headers.get("authorization");
    if (!incomingAuth || incomingAuth.toLowerCase().includes("dummy") || incomingAuth.toLowerCase().includes("null") || incomingAuth === "Bearer ") {
      headers.set("authorization", `Bearer ${anonKey}`);
    }
    
    // Get body if not a GET/HEAD request
    let body: any = undefined;
    if (request.method !== "GET" && request.method !== "HEAD") {
      body = await request.arrayBuffer();
    }
    
    // Execute request to Supabase
    const response = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
    });
    
    // Copy response headers
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (lowerKey !== "content-encoding" && lowerKey !== "transfer-encoding") {
        responseHeaders.set(key, value);
      }
    });
    
    // Get response body as ArrayBuffer
    const responseBody = await response.arrayBuffer();
    
    return new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error("Mobile RFID Proxy Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Proxy redirection failed." },
      { status: 500 }
    );
  }
}
