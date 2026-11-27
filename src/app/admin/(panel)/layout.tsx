import { redirect } from "next/navigation";
import { Toaster } from "sonner";
import { currentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminUserProvider, RoleGate } from "@/components/admin/AdminUser";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await currentUser();
  if (!user) redirect("/admin/login");
  const settings = await getSettings();
  return (
    <AdminUserProvider user={user} mosqueName={settings.mosque.name}>
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
