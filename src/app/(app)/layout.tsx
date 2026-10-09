import Link from "next/link";
import { Button } from "@/components/ui/button";
import { signOut } from "@/features/auth/actions";
import { getCurrentUser } from "@/features/auth/queries";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();

  return (
    <>
      <header className="border-b border-foreground/10">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
          <Link href="/projects" className="font-semibold tracking-tight">
            Rushs
          </Link>
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm text-foreground/70">{user.fullName}</span>
            <form action={signOut}>
              <Button type="submit" variant="ghost">
                Déconnexion
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </>
  );
}
