import { BottomNav } from "@/components/navigation/bottom-nav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-slate-50 pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <main className="h-full">{children}</main>
      <BottomNav />
    </div>
  );
}
