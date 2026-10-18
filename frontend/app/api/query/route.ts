import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const backendUrl = process.env.BACKEND_URL; // Private server-side variable

    if (!backendUrl) {
      return NextResponse.json(
        { error: "Backend URL not configured" },
        { status: 500 },
      );
    }

    // Extract session ID from incoming frontend headers
    const sessionId = request.headers.get("X-Session-ID");

    // Forward request securely to your Render backend stream endpoint
    const backendResponse = await fetch(`${backendUrl}/v1/navigate/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(sessionId && { "X-Session-ID": sessionId }),
      },
      body: JSON.stringify(body),
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      return NextResponse.json(
        { error: errorText },
        { status: backendResponse.status },
      );
    }

    // Stream the response body directly back to the frontend
    return new NextResponse(backendResponse.body, {
      status: backendResponse.status,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { error: "Failed to communicate with backend" },
      { status: 500 },
    );
  }
}
