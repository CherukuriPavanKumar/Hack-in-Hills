"use client";

import React, { useState } from "react";
import { ShieldCheck, ShieldX, RefreshCw, Terminal, CheckCircle2, ArrowRight } from "lucide-react";
import { BoundaryProbe, executeLiveProbes } from "@/lib/api";

interface TopologyMapProps {
  initialProbes?: BoundaryProbe[];
}

export function TopologyMap({ initialProbes = [] }: TopologyMapProps) {
  const [probes, setProbes] = useState<BoundaryProbe[]>(initialProbes);
  const [isRunningProbes, setIsRunningProbes] = useState(false);
  const [selectedProbe, setSelectedProbe] = useState<BoundaryProbe | null>(
    initialProbes.length > 0 ? initialProbes[0] : null
  );

  const handleRunLiveProbes = async () => {
    setIsRunningProbes(true);
    try {
      const results = await executeLiveProbes();
      setProbes(results);
      if (results.length > 0) setSelectedProbe(results[0]);
    } catch (err) {
      console.error("Probe error:", err);
    } finally {
      setIsRunningProbes(false);
    }
  };

  return (
    <div className="bg-surface border border-edge rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-edge flex flex-wrap items-center justify-between gap-4 bg-canvas/40">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-signal-blue"></span>
            <h3 className="text-sm font-semibold text-label-primary tracking-wide">
              Network Isolation & Boundary Verification
            </h3>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-subtle text-label-secondary border border-edge">
              Live Topology
            </span>
          </div>
          <p className="text-xs text-label-muted mt-0.5">
            Docker network segmentation assertions between Red, Blue, Gateway, and Model zones.
          </p>
        </div>

        <button
          onClick={handleRunLiveProbes}
          disabled={isRunningProbes}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-subtle hover:bg-edge border border-edge text-label-primary text-xs font-mono transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${isRunningProbes ? "animate-spin" : ""}`} />
          <span>{isRunningProbes ? "Probing..." : "Execute Socket Probes"}</span>
        </button>
      </div>

      {/* Architectural Topology Schematic */}
      <div className="p-6 border-b border-edge">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Node 1: Red Runner */}
          <div className="bg-canvas border border-edge rounded p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-[10px] font-mono text-label-muted">
                <span>ZONE 1</span>
                <span className="px-1.5 py-0.5 rounded bg-subtle border border-edge">red-net</span>
              </div>
              <h4 className="text-xs font-semibold text-label-primary mt-2">Red Runner</h4>
              <p className="text-[11px] text-label-muted mt-1 leading-relaxed">
                Untrusted test runner container executing adversarial benchmarks.
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-edge-subtle text-[10px] font-mono text-label-muted">
              Port: <span className="text-label-secondary font-medium">8004</span>
            </div>
          </div>

          {/* Node 2: Policy Gateway (Mediation Center) */}
          <div className="bg-canvas border-2 border-edge-hover rounded p-4 flex flex-col justify-between relative shadow-sm">
            <div>
              <div className="flex items-center justify-between text-[10px] font-mono text-label-muted">
                <span className="text-signal-blue font-semibold">MEDIATION BOUNDARY</span>
                <span className="px-1.5 py-0.5 rounded bg-subtle border border-edge">red + model</span>
              </div>
              <h4 className="text-xs font-semibold text-label-primary mt-2">Policy Gateway</h4>
              <p className="text-[11px] text-label-muted mt-1 leading-relaxed">
                Sole permissible ingress point. Enforces budgets, allow-lists, and regex.
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-edge-subtle flex items-center justify-between text-[10px] font-mono text-label-muted">
              <span>Port: <span className="text-label-secondary font-medium">8002</span></span>
              <span className="text-signal-emerald font-semibold">Active</span>
            </div>
          </div>

          {/* Node 3: Target Model */}
          <div className="bg-canvas border border-edge rounded p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-[10px] font-mono text-label-muted">
                <span>ZONE 2</span>
                <span className="px-1.5 py-0.5 rounded bg-subtle border border-edge">model-net only</span>
              </div>
              <h4 className="text-xs font-semibold text-label-primary mt-2">Target Model</h4>
              <p className="text-[11px] text-label-muted mt-1 leading-relaxed">
                Inference runtime. Completely unrouted from Red runner network.
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-edge-subtle text-[10px] font-mono text-label-muted">
              Port: <span className="text-label-secondary font-medium">8003</span>
            </div>
          </div>

          {/* Node 4: Blue Policy Workspace */}
          <div className="bg-canvas border border-edge rounded p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-[10px] font-mono text-label-muted">
                <span>ZONE 3</span>
                <span className="px-1.5 py-0.5 rounded bg-subtle border border-edge">blue-net only</span>
              </div>
              <h4 className="text-xs font-semibold text-label-primary mt-2">Blue Policy</h4>
              <p className="text-[11px] text-label-muted mt-1 leading-relaxed">
                Defensive rules repository. Private volume partitioned from Red.
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-edge-subtle text-[10px] font-mono text-label-muted">
              Port: <span className="text-label-secondary font-medium">8001</span>
            </div>
          </div>

        </div>

        {/* Minimal Boundary Assertions Summary */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 font-mono text-[11px]">
          <div className="p-2.5 rounded bg-canvas border border-edge flex items-center justify-between">
            <span className="text-label-secondary">Red → Blue</span>
            <span className="px-1.5 py-0.2 rounded bg-signal-rose/10 text-signal-rose font-semibold">Denied (T1)</span>
          </div>

          <div className="p-2.5 rounded bg-canvas border border-edge flex items-center justify-between">
            <span className="text-label-secondary">Blue → Red</span>
            <span className="px-1.5 py-0.2 rounded bg-signal-rose/10 text-signal-rose font-semibold">Denied (T2)</span>
          </div>

          <div className="p-2.5 rounded bg-canvas border border-edge flex items-center justify-between">
            <span className="text-label-secondary">Red → Target Direct</span>
            <span className="px-1.5 py-0.2 rounded bg-signal-rose/10 text-signal-rose font-semibold">Denied (T3)</span>
          </div>

          <div className="p-2.5 rounded bg-canvas border border-edge flex items-center justify-between">
            <span className="text-label-secondary">Red → Gateway</span>
            <span className="px-1.5 py-0.2 rounded bg-signal-emerald/10 text-signal-emerald font-semibold">Allowed (T4)</span>
          </div>

          <div className="p-2.5 rounded bg-canvas border border-edge flex items-center justify-between">
            <span className="text-label-secondary">Shared Storage</span>
            <span className="px-1.5 py-0.2 rounded bg-signal-rose/10 text-signal-rose font-semibold">Denied (T5)</span>
          </div>
        </div>
      </div>

      {/* Raw Machine Evidence Table */}
      <div className="p-5">
        <div className="flex items-center space-x-1.5 text-xs font-mono text-label-secondary mb-3">
          <Terminal className="w-3.5 h-3.5 text-label-muted" />
          <span className="font-semibold text-label-primary">Machine-Readable Socket Probe Evidence</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-edge text-label-muted">
                <th className="py-2 px-3 font-normal">Assertion</th>
                <th className="py-2 px-3 font-normal">Source</th>
                <th className="py-2 px-3 font-normal">Destination</th>
                <th className="py-2 px-3 font-normal">Expected</th>
                <th className="py-2 px-3 font-normal">Observed</th>
                <th className="py-2 px-3 font-normal">Verdict</th>
                <th className="py-2 px-3 font-normal">Raw Socket Error / Trace</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge-subtle">
              {probes.map((probe) => (
                <tr
                  key={probe.probe_name}
                  onClick={() => setSelectedProbe(probe)}
                  className={`hover:bg-subtle/50 cursor-pointer transition-colors ${
                    selectedProbe?.probe_name === probe.probe_name ? "bg-subtle" : ""
                  }`}
                >
                  <td className="py-2 px-3 font-medium text-label-primary">{probe.probe_name}</td>
                  <td className="py-2 px-3 text-label-muted">{probe.source_zone}</td>
                  <td className="py-2 px-3 text-label-muted">{probe.destination}</td>
                  <td className="py-2 px-3">
                    <span className="px-1.5 py-0.5 rounded bg-subtle text-label-secondary">
                      {probe.expected}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <span className={`px-1.5 py-0.5 rounded font-medium ${
                      probe.observed === "DENY" ? "text-signal-rose" : "text-signal-emerald"
                    }`}>
                      {probe.observed}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-semibold text-signal-emerald">
                    {probe.verdict}
                  </td>
                  <td className="py-2 px-3 text-label-muted max-w-xs truncate" title={probe.evidence_ref}>
                    {probe.evidence_ref}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
