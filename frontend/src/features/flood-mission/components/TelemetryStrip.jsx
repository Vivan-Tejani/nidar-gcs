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
      className="telemetry-bar h-12 grid grid-cols-6 items-stretch bg-[#0a0b10]/40 backdrop-blur-xl border border-white/10 rounded-[4px] overflow-hidden select-none w-full"
      aria-label="Flight Telemetry Dashboard"
    >
      {/* 1. FLIGHT PHASE */}
      <div className="border-r border-white/10 px-3 flex flex-col justify-center items-center text-center min-w-0">
        <span className="font-sans text-[10px] font-medium uppercase tracking-[0.05em] text-[#A1A1AA]">
          FLIGHT PHASE
        </span>
        <div className="flex items-center justify-center gap-1.5 mt-0.5 leading-none">
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              active
                ? "bg-[#F97316] shadow-[0_0_6px_rgba(249,115,22,0.5)]"
                : "bg-[#52525B]"
            }`}
          />
          <span
            className={`font-mono text-[13px] font-semibold tabular-nums leading-none ${
              active ? "text-[#F97316]" : "text-[#F4F4F5]"
            }`}
          >
            {phaseLabel}
          </span>
        </div>
      </div>

      {/* 2. MISSION CLOCK */}
      <div className="border-r border-white/10 px-3 flex flex-col justify-center items-center text-center min-w-0">
        <span className="font-sans text-[10px] font-medium uppercase tracking-[0.05em] text-[#A1A1AA]">
          MISSION CLOCK
        </span>
        <div className="flex items-center justify-center gap-1 mt-0.5 leading-none">
          <span className="font-mono text-[13px] font-semibold text-[#F4F4F5] tabular-nums leading-none">
            {formatTime(simTime)}
          </span>
          <span className="font-mono text-[11px] font-medium text-[#71717A] tabular-nums leading-none">
            / 30:00
          </span>
        </div>
      </div>

      {/* 3. ALTITUDE */}
      <div className="border-r border-white/10 px-3 flex flex-col justify-center items-center text-center min-w-0">
        <span className="font-sans text-[10px] font-medium uppercase tracking-[0.05em] text-[#A1A1AA]">
          ALTITUDE
        </span>
        <span className="font-mono text-[13px] font-semibold text-[#F4F4F5] tabular-nums leading-none mt-0.5">
          {altitude !== null && Number.isFinite(altitude) ? `${altitude.toFixed(1)} m` : "0.0 m"}
        </span>
      </div>

      {/* 4. SPEED */}
      <div className="border-r border-white/10 px-3 flex flex-col justify-center items-center text-center min-w-0">
        <span className="font-sans text-[10px] font-medium uppercase tracking-[0.05em] text-[#A1A1AA]">
          SPEED
        </span>
        <span className="font-mono text-[13px] font-semibold text-[#F4F4F5] tabular-nums leading-none mt-0.5">
          {active && Number.isFinite(groundSpeed) ? `${groundSpeed.toFixed(1)} m/s` : "0.0 m/s"}
        </span>
      </div>

      {/* 5. BATTERY */}
      <div className="border-r border-white/10 px-3 flex flex-col justify-center items-center text-center min-w-0">
        <span className="font-sans text-[10px] font-medium uppercase tracking-[0.05em] text-[#A1A1AA]">
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
      <div className="px-3 flex flex-col justify-center items-center text-center min-w-0">
        <span className="font-sans text-[10px] font-medium uppercase tracking-[0.05em] text-[#A1A1AA]">
          HEADING
        </span>
        <span className="font-mono text-[13px] font-semibold text-[#F4F4F5] tabular-nums leading-none mt-0.5">
          {heading}
        </span>
      </div>
    </footer>
  );
}
