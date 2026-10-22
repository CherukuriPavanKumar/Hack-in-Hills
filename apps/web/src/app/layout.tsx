"use client";

import React from "react";
import "./globals.css";
import { Header } from "@/components/Header";
import { RoleProvider } from "@/lib/RoleContext";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <title>BAYORA — Trustworthy Isolation for Adversarial AI Testing</title>
        <meta
          name="description"
          content="Isolation and evidence-integrity layer for adversarial AI evaluation. Hack in Hills 2026 Problem Statement 04."
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased bg-[#060911] text-slate-100 flex flex-col min-h-screen">
        <RoleProvider>
          <Header />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-xs text-slate-500 font-mono">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="font-bold text-slate-400">BAYORA</span> — Team CleanSweep (Hack in Hills 2026)
              </div>
              <div>
                Problem Statement 04: Trustworthy isolation for adversarial AI testing
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>SHA-256 Hash Chained Audit Ledger</span>
              </div>
            </div>
          </footer>
        </RoleProvider>
      </body>
    </html>
  );
}
