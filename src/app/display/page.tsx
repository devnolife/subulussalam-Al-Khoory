import type { Metadata } from "next";
import { DisplayApp } from "@/components/display/DisplayApp";

export const metadata: Metadata = { title: "Layar Informasi · Masjid Subulussalam Al-Khoory" };

export default function DisplayPage() {
  return <DisplayApp />;
}
