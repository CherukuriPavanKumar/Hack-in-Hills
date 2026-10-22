"use client";

import React from "react";
import { ShieldCheck, AlertTriangle, CheckCircle, Info } from "lucide-react";

export function WhatThisProves() {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-lg backdrop-blur-sm">
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-3 mb-4">
        <Info className="w-4 h-4 text-cyan-400" />
        <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-mono">
          Security Assurance & Boundary Disclosure
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        {/* Left Column: What this Proves */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-emerald-400 font-bold uppercase tracking-wider">
            <CheckCircle className="w-4 h-4" />
            <span>What this prototype proves</span>
          </div>
          <ul className="space-y-2 text-slate-300">
            <li className="flex items-start space-x-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>
                <strong>Network Segmentation:</strong> Untrusted Red runner has no network route to the Target Model or Blue workspace in Docker network namespaces.
              </span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>
                <strong>Policy Mediation:</strong> All model traffic is strictly routed through the Policy Gateway; unauthorized injections and canary exfiltrations are blocked before reaching model inference.
              </span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>
                <strong>Session Context Isolation:</strong> Ephemeral session allocation guarantees run A cannot leak memory or canary tokens into run B.
              </span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>
                <strong>Audit Immutability & Tamper Detection:</strong> SHA-256 canonical hash chaining guarantees any post-hoc modification to stored audit logs is mathematically detected.
              </span>
            </li>
          </ul>
        </div>

        {/* Right Column: What this Does NOT Prove */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-amber-400 font-bold uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4" />
            <span>What this does not prove (Residual Risks)</span>
          </div>
          <ul className="space-y-2 text-slate-300">
            <li className="flex items-start space-x-2">
              <span className="text-amber-400 font-bold">!</span>
              <span>
                <strong>Shared Host Kernel:</strong> Linux containers share the host kernel. High-threat multi-tenant environments require dedicated VM hypervisors (e.g. AWS Firecracker or gVisor) to mitigate kernel exploits.
              </span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-amber-400 font-bold">!</span>
              <span>
                <strong>Hardware Side-Channels:</strong> Container boundaries do not prevent hardware microarchitectural timing attacks (Spectre/Meltdown) without dedicated core pinning.
              </span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-amber-400 font-bold">!</span>
              <span>
                <strong>External Head Anchoring:</strong> A local hash chain is tamper-evident, but an attacker with complete host filesystem control could re-hash. Production non-repudiation requires anchoring block digests to external immutable ledgers or HSMs.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
