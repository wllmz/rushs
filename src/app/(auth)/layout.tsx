export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <p className="mb-8 text-center text-2xl font-semibold tracking-tight">Rushs</p>
        {children}
      </div>
    </main>
  );
}
