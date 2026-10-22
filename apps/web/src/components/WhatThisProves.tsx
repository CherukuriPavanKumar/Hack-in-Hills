"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";

export function WhatThisProves() {
  return (
    <div className="bg-surface border border-edge rounded-lg p-5">
      <div className="flex items-center space-x-2 border-b border-edge pb-3 mb-4">
        <ShieldCheck className="w-4 h-4 text-signal-blue" />
        <h3 className="text-xs font-semibold text-label-primary uppercase tracking-wider font-mono">
          Security Boundary Scope & Honest Limitations
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        {/* Left Column: What this Proves */}
        <div className="space-y-3">
          <div className="text-[11px] font-mono font-semibold text-signal-emerald uppercase tracking-wider">
            Verified in this Prototype
          </div>
          <ul className="space-y-2 text-label-secondary">
            <li className="flex items-start space-x-2">
              <span className="text-signal-emerald font-bold">✓</span>
              <span>
                <strong className="text-label-primary">Network Isolation:</strong> Red runner has no network path to Target Model or Blue workspace across private Compose networks.
              </span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-signal-emerald font-bold">✓</span>
              <span>
                <strong className="text-label-primary">Enforceable Mediation:</strong> All inference requests pass through the Policy Gateway; injections and canaries are intercepted before reaching the model.
              </span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-signal-emerald font-bold">✓</span>
              <span>
                <strong className="text-label-primary">Context Cleansing:</strong> Fresh ephemeral session tokens ensure Run A cannot leak memory or context into Run B.
              </span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-signal-emerald font-bold">✓</span>
              <span>
                <strong className="text-label-primary">Tamper-Evident Ledger:</strong> SHA-256 canonical event chaining ensures post-hoc record mutations fail cryptographic validation.
              </span>
            </li>
          </ul>
        </div>

        {/* Right Column: What this Does NOT Prove */}
        <div className="space-y-3">
          <div className="text-[11px] font-mono font-semibold text-signal-amber uppercase tracking-wider">
            Stated Production Residual Risks
          </div>
          <ul className="space-y-2 text-label-secondary">
            <li className="flex items-start space-x-2">
              <span className="text-signal-amber font-bold">!</span>
              <span>
                <strong className="text-label-primary">Shared Host Kernel:</strong> Linux containers share the host kernel. High-threat multi-tenant environments require hypervisor microVMs (e.g., AWS Firecracker/gVisor).
              </span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-signal-amber font-bold">!</span>
              <span>
                <strong className="text-label-primary">Microarchitectural Side-Channels:</strong> Container namespaces do not prevent hardware CPU cache timing attacks without core pinning.
              </span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-signal-amber font-bold">!</span>
              <span>
                <strong className="text-label-primary">External Anchor Requirement:</strong> Strong enterprise non-repudiation requires periodically anchoring the chain head to an external HSM or immutable cloud ledger.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
