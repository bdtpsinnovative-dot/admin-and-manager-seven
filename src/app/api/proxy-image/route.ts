import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) {
    return NextResponse.json({ error: "Invalid or missing url parameter" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Failed to fetch image (HTTP ${res.status})` }, { status: res.status });
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await res.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (err: any) {
    console.error("[proxy-image] Error fetching image:", err);
    return NextResponse.json({ error: err.message || "Failed to proxy image" }, { status: 500 });
  }
}
