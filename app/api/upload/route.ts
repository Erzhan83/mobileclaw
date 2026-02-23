import { NextRequest, NextResponse } from "next/server";

// Proxy upload to litterbox.catbox.moe — free, no API key, temporary files.
// Files expire after the specified duration (default 72h).

const LITTERBOX_API = "https://litterbox.catbox.moe/resources/internals/api.php";
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB (litterbox allows up to 1 GB)
const DEFAULT_EXPIRY = "72h"; // 1h, 12h, 24h, 72h

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const expiry = formData.get("expiry") as string | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `File too large (${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB max)` }, { status: 413 });
    }

    const time = ["1h", "12h", "24h", "72h"].includes(expiry ?? "") ? expiry! : DEFAULT_EXPIRY;

    const form = new FormData();
    form.append("reqtype", "fileupload");
    form.append("time", time);
    form.append("fileToUpload", file);

    const res = await fetch(LITTERBOX_API, {
      method: "POST",
      body: form,
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[Upload] litterbox error:", res.status, text);
      return NextResponse.json({ error: `Upload failed: ${text}` }, { status: 502 });
    }

    const url = (await res.text()).trim();
    console.log("[Upload] success:", url, `(${(file.size / 1024).toFixed(1)}KB, expires ${time})`);
    return NextResponse.json({ url });
  } catch (e) {
    console.error("[Upload] exception:", e);
    return NextResponse.json(
      { error: `Upload failed: ${e instanceof Error ? e.message : "unknown"}` },
      { status: 500 },
    );
  }
}
