"use client";

import React from "react";
import { Battery } from "lucide-react";

export default function TelemetryStrip({
  phaseLabel = "STANDBY",
  simTime = 0,
  altitude = null,
  groundSpeed = null,
  battery = "--",
  heading = "—",
  active = false,
}) {
  const formatTime = (seconds = 0) => {
    const total = Math.max(0, Math.floor(seconds));
    const mins = String(Math.floor(total / 60)).padStart(2, "0");
    const secs = String(total % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  };

  return (
    <footer
      className="telemetry-bar h-full grid grid-cols-6 items-stretch bg-[#0a0b10]/50 backdrop-blur-xl border border-white/10 rounded-[16px] overflow-hidden select-none w-full shadow-[0_12px_36px_-4px_rgba(0,0,0,0.55),0_4px_12px_-2px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.14),inset_0_0_0_1px_rgba(255,255,255,0.05)]"
      aria-label="Flight Telemetry Dashboard"
    >
      {/* 1. FLIGHT PHASE */}
      <div className="border-r border-white/[0.08] pl-5 pr-3 flex flex-col justify-center items-center text-center min-w-0">
        <span className="font-sans text-[9px] font-semibold uppercase tracking-[0.08em] text-[#A1A1AA]">
          FLIGHT PHASE
        </span>
        <div className="flex items-center justify-center gap-1.5 mt-0.5 leading-none">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              active
                ? "bg-[#F97316] shadow-[0_0_8px_rgba(249,115,22,0.6)] animate-pulse"
                : "bg-[#52525B]"
            }`}
          />
          <span
            className={`font-mono text-xs font-semibold tracking-wider tabular-nums leading-none ${
              active ? "text-[#F97316]" : "text-[#F4F4F5]"
            }`}
          >
            {phaseLabel}
          </span>
        </div>
      </div>

      {/* 2. MISSION TIME */}
      <div className="border-r border-white/[0.08] px-3 flex flex-col justify-center items-center text-center min-w-0">
        <span className="font-sans text-[9px] font-semibold uppercase tracking-[0.08em] text-[#A1A1AA]">
          MISSION TIME
        </span>
        <div className="flex items-center justify-center gap-1 mt-0.5 leading-none">
          <span className="font-mono text-[13px] font-semibold text-[#F4F4F5] tabular-nums leading-none">
            {formatTime(simTime)}
          </span>
          <span className="font-mono text-[11px] font-medium text-[#71717A] tabular-nums leading-none">
            / 30:00
          </span>
        </div>
        <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden mt-1">
          <div
            className="h-full bg-amber-500 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, (simTime / 1800) * 100))}%` }}
          />
        </div>
      </div>

      {/* 3. ALTITUDE */}
      <div className="border-r border-white/[0.08] px-3 flex flex-col justify-center items-center text-center min-w-0">
        <span className="font-sans text-[9px] font-semibold uppercase tracking-[0.08em] text-[#A1A1AA]">
          ALTITUDE
        </span>
        <div className="flex items-baseline justify-center gap-1 mt-0.5 leading-none">
          <span className="font-mono text-[13px] font-semibold text-[#F4F4F5] tabular-nums leading-none">
            {altitude !== null && Number.isFinite(altitude) ? altitude.toFixed(1) : "0.0"}
          </span>
          <span className="font-sans text-[10px] text-[#A1A1AA] font-medium">m</span>
        </div>
      </div>

      {/* 4. SPEED */}
      <div className="border-r border-white/[0.08] px-3 flex flex-col justify-center items-center text-center min-w-0">
        <span className="font-sans text-[9px] font-semibold uppercase tracking-[0.08em] text-[#A1A1AA]">
          SPEED
        </span>
        <div className="flex items-baseline justify-center gap-1 mt-0.5 leading-none">
          <span className="font-mono text-[13px] font-semibold text-[#F4F4F5] tabular-nums leading-none">
            {active && Number.isFinite(groundSpeed) ? groundSpeed.toFixed(1) : "0.0"}
          </span>
          <span className="font-sans text-[10px] text-[#A1A1AA] font-medium">m/s</span>
        </div>
      </div>

      {/* 5. BATTERY */}
      <div className="border-r border-white/[0.08] px-3 flex flex-col justify-center items-center text-center min-w-0">
        <span className="font-sans text-[9px] font-semibold uppercase tracking-[0.08em] text-[#A1A1AA]">
          BATTERY
        </span>
        <div className="flex items-center justify-center gap-1.5 mt-0.5 leading-none">
          <Battery size={13} className={active ? "text-emerald-400" : "text-[#A1A1AA]"} />
          <span className="font-mono text-[13px] font-semibold text-[#F4F4F5] tabular-nums leading-none">
            {battery}
          </span>
        </div>
      </div>

      {/* 6. HEADING */}
      <div className="pl-3 pr-5 flex flex-col justify-center items-center text-center min-w-0">
        <span className="font-sans text-[9px] font-semibold uppercase tracking-[0.08em] text-[#A1A1AA]">
          HEADING
        </span>
        <span className="font-mono text-[13px] font-semibold text-[#F4F4F5] tabular-nums leading-none mt-0.5">
          {heading}
        </span>
      </div>
    </footer>
  );
}
