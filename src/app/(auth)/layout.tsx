export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-gradient-to-b from-background to-muted/40 p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-2 text-2xl font-semibold tracking-tight">
            KINTSU <span className="text-primary">OS</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Enterprise retail operating system
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
