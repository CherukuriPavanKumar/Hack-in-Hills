import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { RoleProvider } from "../lib/role-context";
import { AppShell } from "../components/AppShell";
import { Toaster } from "../components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-background px-4">
      <div className="max-w-md text-center space-y-4">
        <span className="font-mono text-5xl font-extrabold text-indigo-600 dark:text-indigo-400">
          404
        </span>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Endpoint Not Found</h1>
        <p className="text-xs text-muted-foreground leading-relaxed">
          The requested security route or evaluation view does not exist in the active control plane
          manifest.
        </p>
        <div className="pt-2">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors"
          >
            Return to Control Room
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  const router = useRouter();

  useEffect(() => {
    if (typeof console !== "undefined" && console.error) {
      console.error("[BAYORA Boundary Exception]", error);
    }
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-background px-4">
      <div className="max-w-lg rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-4">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-destructive/15 text-destructive font-mono font-bold text-sm">
          !
        </div>
        <h1 className="text-lg font-bold tracking-tight text-foreground">
          Control Plane Execution Anomaly
        </h1>
        <p className="text-xs text-muted-foreground leading-relaxed">
          An unhandled boundary exception occurred. The runtime sandbox safely prevented session
          leakage.
        </p>
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 cursor-pointer"
          >
            Retry Execution
          </button>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
          >
            Overview
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "BAYORA — AI Safety Testing Infrastructure & Evidence Plane" },
      {
        name: "description",
        content:
          "Enterprise adversarial AI testing control plane. Enforces 4-zone network isolation, policy gateway mediation, fresh session contexts, and cryptographic SHA-256 tamper-evident audit ledgers.",
      },
      { name: "author", content: "Bayora Security Systems" },
      { property: "og:title", content: "BAYORA — AI Safety Testing Infrastructure" },
      {
        property: "og:description",
        content:
          "Verifiable network isolation and cryptographic audit chains for adversarial AI safety evaluation.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/brand/og-image.svg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "BAYORA — AI Safety Testing Infrastructure" },
      {
        name: "twitter:description",
        content:
          "Test the model. Trust the environment. Verifiable isolation for adversarial AI testing.",
      },
      { name: "twitter:image", content: "/brand/og-image.svg" },
      { name: "theme-color", content: "#0f172a" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "alternate icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <RoleProvider>
        <AppShell>
          <Outlet />
        </AppShell>
        <Toaster position="top-right" richColors />
      </RoleProvider>
    </QueryClientProvider>
  );
}
