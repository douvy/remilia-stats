import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  // Only allow proxying from remilia.com domains
  const allowedDomains = [
    "https://remilia.com/",
    "https://static.remilia.com/",
    "https://pfp.remilia.com/"
  ];

  if (!allowedDomains.some(domain => url.startsWith(domain))) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      return NextResponse.json({ error: "Failed to fetch image" }, { status: response.status });
    }

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "image/png",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Proxy image error:", error);
    return NextResponse.json({ error: "Failed to fetch image" }, { status: 500 });
  }
}
