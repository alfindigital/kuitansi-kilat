import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_app")({
  component: () => <AppShell />,
});

// Re-export Outlet to silence linters about unused imports.
export { Outlet };
