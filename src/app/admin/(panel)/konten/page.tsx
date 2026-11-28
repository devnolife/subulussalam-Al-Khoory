import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { CONTENT_MENU, FINANCE_MENU, canOpen, type MenuItem } from "@/components/admin/menu";
import { EmptyState, PageHeader } from "@/components/admin/ui";
import { TONE_TEXT } from "@/components/display/ui";
import { currentUser } from "@/lib/auth";

const SECTIONS = [
  { title: "Konten layar", items: CONTENT_MENU },
  { title: "Keuangan", items: FINANCE_MENU },
];

function MenuGrid({ items }: { items: MenuItem[] }) {
  return (
    <ul className="grid grid-cols-1 gap-x-6 sm:grid-cols-2 xl:grid-cols-3">
      {items.map(({ href, label, desc, icon: Icon, tone }) => (
        <li key={href} className="border-b border-line">
          <Link
            href={href}
            className="flex h-full items-center gap-3 py-3 hover:bg-navy-800"
          >
            <Icon className={`size-5 shrink-0 ${TONE_TEXT[tone]}`} aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block font-bold">{label}</span>
              <span className="mt-0.5 block text-sm leading-snug text-muted">{desc}</span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function KontenPage() {
  const user = await currentUser();
  if (!user) redirect("/admin/login");
  const sections = SECTIONS.map((s) => ({ ...s, items: s.items.filter((i) => canOpen(user.role, i.href)) })).filter((s) => s.items.length > 0);
  return (
    <div>
      <PageHeader title="Konten" />
      {sections.length === 0 ? (
        <EmptyState>Tidak ada menu konten untuk peran akun Anda.</EmptyState>
      ) : (
        <div className="space-y-8">
          {sections.map((s) => (
            <section key={s.title} aria-label={s.title}>
              {sections.length > 1 && <h2 className="panel-heading mb-2">{s.title}</h2>}
              <MenuGrid items={s.items} />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}