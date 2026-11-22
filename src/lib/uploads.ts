import path from "path";

export function uploadDir(): string {
  return path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR || path.join(process.cwd(), "data", "uploads"));
}

export const UPLOAD_NAME = /^[a-z0-9-]+\.(webp|png|jpg)$/;
