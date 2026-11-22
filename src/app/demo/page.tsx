import { connection } from "next/server";
import { notFound } from "next/navigation";
import { DemoControls } from "@/components/demo/DemoControls";

export default async function DemoPage() {
  await connection();
  if (process.env.DEMO_MODE !== "1") notFound();
  return <DemoControls />;
}
