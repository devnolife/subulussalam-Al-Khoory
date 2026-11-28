import { redirect } from "next/navigation";
import { Toaster } from "sonner";
import { currentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { ROLE_LABELS } from "@/lib/permissions";
import { MosqueMark } from "@/components/MosqueMark";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminUserProvider, RoleGate } from "@/components/admin/AdminUser";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await currentUser();
  if (!user) redirect("/admin/login");
  const settings = await getSettings();
  return (
    <AdminUserProvider user={user} mosqueName={settings.mosque.name}>
      <div className="scene min-h-dvh">
        <a href="#isi-panel" className="sr-only z-50 rounded-lg bg-gold-400 px-4 py-3 font-semibold text-navy-950 focus:fixed focus:top-2 focus:left-2 focus:not-sr-only">
          Langsung ke isi panel
        </a>
        <AdminSidebar mosque={{ name: settings.mosque.name, logo: settings.mosque.logo }} />
        <div className="lg:pl-64">
          <header className="border-b border-line bg-navy-900 pt-[env(safe-area-inset-top)] lg:hidden">
            <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 sm:px-6">
              <MosqueMark logo={settings.mosque.logo} className="size-10 rounded-lg p-1.5" />
              <div className="min-w-0">
                <p className="text-sm leading-snug font-bold">{settings.mosque.name}</p>
                <p className="text-xs text-muted">{ROLE_LABELS[user.role]}</p>
              </div>
            </div>
          </header>
          <main id="isi-panel" tabIndex={-1} className="mx-auto w-full max-w-3xl px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 lg:max-w-7xl lg:px-8 lg:pt-9 lg:pb-12">
            <RoleGate>{children}</RoleGate>
          </main>
        </div>
        <AdminNav />
        <Toaster position="top-center" theme="dark" richColors />
      </div>
    </AdminUserProvider>
  );
}
