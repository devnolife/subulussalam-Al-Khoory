import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { authorize, handleError, jsonError } from "@/lib/api";
import { uploadDir } from "@/lib/uploads";

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Unggah gambar: poster dikompres ke WebP (maks 1920px), foto orang ke WebP (maks 800px),
 * QRIS/logo disimpan PNG lossless agar tetap tajam dan bisa dipindai.
 */
export async function POST(request: Request) {
  const user = await authorize("upload");
  if (user instanceof NextResponse) return user;
  try {
    const form = await request.formData();
    const file = form.get("file");
    const kind = String(form.get("kind") ?? "poster");
    if (!(file instanceof File)) return jsonError("File tidak ditemukan");
    if (!file.type.startsWith("image/")) return jsonError("File harus berupa gambar");
    if (file.size > MAX_BYTES) return jsonError("Ukuran gambar maksimal 10 MB");

    const input = Buffer.from(await file.arrayBuffer());
    const lossless = kind === "qris" || kind === "logo";
    const max = kind === "photo" ? 800 : 1920;
    const img = sharp(input).rotate().resize({ width: max, height: max, fit: "inside", withoutEnlargement: true });
    const output = lossless ? await img.png().toBuffer() : await img.webp({ quality: 82 }).toBuffer();
    const name = `${randomUUID()}.${lossless ? "png" : "webp"}`;

    await mkdir(uploadDir(), { recursive: true });
    await writeFile(path.join(/*turbopackIgnore: true*/ uploadDir(), name), output);
    return NextResponse.json({ url: `/uploads/${name}` }, { status: 201 });
  } catch (e) {
    if (e instanceof Error && /unsupported image format|Input buffer/i.test(e.message)) {
      return jsonError("Format gambar tidak didukung");
    }
    return handleError(e);
  }
}
