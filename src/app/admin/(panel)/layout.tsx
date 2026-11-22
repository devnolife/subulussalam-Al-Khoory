import { redirect } from "next/navigation";
import { Toaster } from "sonner";
import { isAuthenticated } from "@/lib/auth";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  return (
    <div className="scene min-h-dvh">
      <main className="mx-auto max-w-lg px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-28">{children}</main>
      <AdminNav />
      <Toaster position="top-center" theme="dark" richColors />
    </div>
  );
}
