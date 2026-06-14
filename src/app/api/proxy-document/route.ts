import { NextRequest, NextResponse } from "next/server";
import { BASE_URL } from "@/app/(dashboard)/LibraAI/apiService";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const path = searchParams.get("path");

  if (!path) {
    return new NextResponse("Missing path parameter", { status: 400 });
  }

  // Ensure path starts with a slash
  const formattedPath = path.startsWith("/") ? path : `/${path}`;
  const backendUrl = `${BASE_URL}${formattedPath}`;

  try {
    const response = await fetch(backendUrl, {
      headers: {
        "ngrok-skip-browser-warning": "true",
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch document from backend: ${response.status} ${response.statusText}`);
      return new NextResponse("Document not found or inaccessible", { status: response.status });
    }

    // Stream the response back to the client
    const headers = new Headers();
    const contentType = response.headers.get("content-type");
    if (contentType) {
      headers.set("Content-Type", contentType);
    }
    
    // Add caching headers
    headers.set("Cache-Control", "public, max-age=3600");

    return new NextResponse(response.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Error proxying document:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
