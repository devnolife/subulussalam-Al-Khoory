import type { Metadata } from "next";
import { DisplayApp } from "@/components/display/DisplayApp";

export const metadata: Metadata = { title: "Layar Informasi · Masjid Subulussalam Al-Khoory" };

/** Alamat lama, sama dengan TV 1 (/display/1). */
export default function DisplayPage() {
  return <DisplayApp tv={1} />;
}
