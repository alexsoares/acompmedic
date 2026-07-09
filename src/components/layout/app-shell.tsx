type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return <div className="min-h-screen bg-[var(--color-app-surface)] text-foreground">{children}</div>;
}
