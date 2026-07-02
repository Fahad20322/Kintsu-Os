import { NextResponse } from "next/server";
import { generateBarcodePng } from "@/lib/barcode";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  try {
    const png = await generateBarcodePng(decodeURIComponent(code));
    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid barcode value" }, { status: 400 });
  }
}
