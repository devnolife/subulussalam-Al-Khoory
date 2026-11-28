import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DisplayApp } from "@/components/display/DisplayApp";
import { DISPLAY_IDS, parseDisplayId } from "@/lib/types";

/** Hanya /display/1, /display/2, dan /display/3. */
export const dynamicParams = false;

export function generateStaticParams() {
  return DISPLAY_IDS.map((id) => ({ tv: String(id) }));
}

export async function generateMetadata({ params }: PageProps<"/display/[tv]">): Promise<Metadata> {
  const { tv } = await params;
  return { title: `TV ${tv} · Layar Informasi · Masjid Subulussalam Al-Khoory` };
}

export default async function DisplayTvPage({ params }: PageProps<"/display/[tv]">) {
  const tv = parseDisplayId((await params).tv);
  if (!tv) notFound();
  return <DisplayApp tv={tv} />;
}
