import { redirect } from "next/navigation";
import { Toaster } from "sonner";
import { currentUser } from "@/lib/auth";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminUserProvider, RoleGate } from "@/components/admin/AdminUser";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await currentUser();
  if (!user) redirect("/admin/login");
  return (
    <AdminUserProvider user={user}>
      <div className="scene min-h-dvh">
        <main className="mx-auto max-w-lg px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-28">
          <RoleGate>{children}</RoleGate>
        </main>
        <AdminNav />
        <Toaster position="top-center" theme="dark" richColors />
      </div>
    </AdminUserProvider>
  );
}
