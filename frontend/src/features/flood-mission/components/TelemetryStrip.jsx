"use client";

import React from "react";

export default function TelemetryStrip({
  phaseLabel = "STANDBY",
  simTime = 0,
  altitude = null,
  survivorCount = 0,
  groundSpeed = null,
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
      className="telemetry-bar h-9 flex items-center justify-between px-4 bg-[#0C1017] border-t border-white/5 select-none"
      aria-label="Flight Telemetry Dashboard"
    >
      <div className="flex items-center gap-6">
        {/* 1. FLIGHT PHASE */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-slate-400">FLIGHT PHASE</span>
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-amber-400" : "bg-slate-500"}`} />
            <span className={`text-xs font-mono font-medium ${active ? "text-amber-400" : "text-slate-200"}`}>
              {phaseLabel}
            </span>
          </div>
        </div>

        {/* Vertical Tick */}
        <div className="h-3.5 w-[1px] bg-white/10" />

        {/* 2. MISSION TIME */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-slate-400">MISSION TIME</span>
          <div className="flex items-center gap-1">
            <span className="text-xs font-mono font-medium text-slate-200">{formatTime(simTime)}</span>
            <span className="text-[10px] font-mono text-slate-400">/ 30:00</span>
          </div>
        </div>

        {/* Vertical Tick */}
        <div className="h-3.5 w-[1px] bg-white/10" />

        {/* 3. LASER ALTITUDE */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-slate-400">LASER ALTITUDE</span>
          <span className="text-xs font-mono font-medium text-slate-200">
            {altitude !== null && Number.isFinite(altitude) ? `${altitude.toFixed(1)} m` : "—"}
          </span>
        </div>

        {/* Vertical Tick */}
        <div className="h-3.5 w-[1px] bg-white/10" />

        {/* 4. GROUND SPEED */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-slate-400">GROUND SPEED</span>
          <span className="text-xs font-mono font-medium text-slate-200">
            {active && Number.isFinite(groundSpeed) ? `${groundSpeed.toFixed(1)} m/s` : "0.0 m/s"}
          </span>
        </div>

        {/* Vertical Tick */}
        <div className="h-3.5 w-[1px] bg-white/10" />

        {/* 5. HEADING (YAW) */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-slate-400">HEADING (YAW)</span>
          <span className="text-xs font-mono font-medium text-slate-200">{heading}</span>
        </div>

        {/* Vertical Tick */}
        <div className="h-3.5 w-[1px] bg-white/10" />

        {/* 6. SURVIVORS DETECTED */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-slate-400">SURVIVORS DETECTED</span>
          <span
            className={`text-xs font-mono font-medium ${
              survivorCount > 0 ? "text-emerald-400 font-semibold" : "text-slate-200"
            }`}
          >
            {String(survivorCount).padStart(2, "0")} / 06
          </span>
        </div>
      </div>

      {/* Right side operational indicator */}
      <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
        <span>GPS-DENIED INDOOR</span>
      </div>
    </footer>
  );
}
