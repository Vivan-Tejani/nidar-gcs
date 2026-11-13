"use client";

import React, { useState } from "react";
import {
  Camera,
  Maximize2,
  Minimize2,
  Crosshair,
  Video,
  Activity
} from "lucide-react";

export default function CameraHUD({
  sessionId,
  stamp,
  active = false,
  expanded = false,
  onToggleExpand,
  apiBase = "http://127.0.0.1:8000",
  altitude = 0,
  speed = 0,
  survivorCount = 0,
}) {
  const [showHUD, setShowHUD] = useState(true);

  // Forward-facing flight camera only
  const src = sessionId
    ? `${apiBase}/simulation/flood/${sessionId}/camera/front?frame=${stamp}`
    : null;

  const handleSnapshot = () => {
    if (!src) return;
    const link = document.createElement("a");
    link.href = src;
    link.download = `DRONE_SNAPSHOT_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section
      className={`camera-hud-card ${expanded ? "camera-hud-expanded" : ""}`}
      aria-label="Forward Optical Feed Viewport"
    >
      {/* 1. Slim Panel Header (32px / h-8) */}
      <div className="camera-card-header h-8 flex items-center justify-between px-3 bg-[#0C1017] border-b border-white/5 select-none">
        <div className="flex items-center gap-2">
          {/* 6px Single Status Dot */}
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              active ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" : "bg-slate-500"
            }`}
          />
          {/* Crisp 11px uppercase monospace title */}
          <strong className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-200">
            FORWARD OPTICAL FEED
          </strong>
        </div>

        {/* Minimalist icon-only toggle buttons on the right (w-6 h-6) */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={`w-6 h-6 flex items-center justify-center rounded-sm transition-colors border-0 ${
              showHUD ? "text-cyan-400 bg-cyan-500/10" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
            onClick={() => setShowHUD(!showHUD)}
            title="Toggle On-Screen Display HUD"
            aria-label="Toggle OSD"
          >
            <Crosshair size={13} />
          </button>

          <button
            type="button"
            className="w-6 h-6 flex items-center justify-center rounded-sm text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors border-0 disabled:opacity-40 disabled:pointer-events-none"
            onClick={handleSnapshot}
            disabled={!src}
            title="Export Frame Snapshot"
            aria-label="Snapshot"
          >
            <Camera size={13} />
          </button>

          <button
            type="button"
            className="w-6 h-6 flex items-center justify-center rounded-sm text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors border-0"
            onClick={onToggleExpand}
            title={expanded ? "Exit Fullscreen" : "Expand Viewport"}
            aria-label={expanded ? "Restore Camera" : "Expand Camera"}
          >
            {expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* 2. Viewport & Video Container (Pure #05070A) */}
      <div className="camera-viewport-body relative w-full h-full min-h-0 bg-[#05070A] overflow-hidden">
        {src ? (
          <img
            src={src}
            alt="Drone forward optical feed stream"
            className="w-full h-full object-contain block select-none"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 w-full h-full p-4 text-center select-none">
            <Video size={28} className="text-slate-500" />
            <strong className="text-[11px] font-mono font-medium tracking-wider text-slate-300">
              AWAITING SIMULATION FEED
            </strong>
            <p className="text-[9px] font-mono text-slate-400 m-0">Forward Camera · Channel 5.8 GHz · RTSP Ready</p>
          </div>
        )}

        {/* Subtle Corner Bracket Reticles (4px L-shaped borders in the four corners) */}
        <div className="absolute top-2 left-2 w-2 h-2 border-t-2 border-l-2 border-white/20 pointer-events-none z-10" />
        <div className="absolute top-2 right-2 w-2 h-2 border-t-2 border-r-2 border-white/20 pointer-events-none z-10" />
        <div className="absolute bottom-2 left-2 w-2 h-2 border-b-2 border-l-2 border-white/20 pointer-events-none z-10" />
        <div className="absolute bottom-2 right-2 w-2 h-2 border-b-2 border-r-2 border-white/20 pointer-events-none z-10" />

        {/* Flight OSD Layer */}
        {showHUD && (
          <div className="absolute inset-0 pointer-events-none select-none">
            {/* Top OSD Bar */}
            <div className="absolute top-2.5 inset-x-3 flex items-center justify-between text-shadow z-10">
              <span className="text-[9px] font-mono text-slate-400 tracking-wider">
                MODE: INDOOR AUTONOMOUS
              </span>
              {active && (
                <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold text-red-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span>REC</span>
                </div>
              )}
            </div>

            {/* Center Artificial Horizon & Reticle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-16 flex items-center justify-center pointer-events-none opacity-80">
              <div className="absolute w-16 h-[1px] bg-white/30" />
              <div className="absolute flex flex-col gap-3">
                <span className="w-4 h-[1px] bg-white/20" />
                <span className="w-4 h-[1px] bg-white/20" />
              </div>
              <div className="w-3.5 h-3.5 border border-white/40 rounded-full relative" />
            </div>

            {/* Frameless HUD Ladder Overlays floating over edges: SPD (left) & ALT (right) */}
            <div className="absolute top-1/2 -translate-y-1/2 left-3 bg-black/60 backdrop-blur-sm border-l-2 border-cyan-500/50 px-2 py-1 flex flex-col items-start font-mono pointer-events-none z-10">
              <span className="text-[7.5px] uppercase tracking-wider text-slate-300 font-semibold">SPD</span>
              <strong className="text-xs font-semibold text-slate-100 tabular-nums">
                {active && Number.isFinite(speed) ? speed.toFixed(1) : "0.0"}
              </strong>
              <span className="text-[7.5px] text-slate-400">m/s</span>
            </div>

            <div className="absolute top-1/2 -translate-y-1/2 right-3 bg-black/60 backdrop-blur-sm border-l-2 border-cyan-500/50 px-2 py-1 flex flex-col items-end font-mono pointer-events-none z-10">
              <span className="text-[7.5px] uppercase tracking-wider text-slate-300 font-semibold">ALT</span>
              <strong className="text-xs font-semibold text-slate-100 tabular-nums">
                {Number.isFinite(altitude) ? altitude.toFixed(1) : "0.0"}
              </strong>
              <span className="text-[7.5px] text-slate-400">m (AGL)</span>
            </div>

            {/* Translucent Overlay Strip merged directly into bottom of camera canvas */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-6 pb-2 px-3 flex items-center justify-between pointer-events-none z-10">
              <div className="flex items-center gap-1.5 text-[9.5px] font-mono text-emerald-400 font-medium">
                <Activity size={12} className="text-emerald-400" />
                <span>DETECTOR: {active ? "TRACKING" : "STANDBY"}</span>
              </div>
              <div className="text-[9.5px] font-mono text-slate-200">
                <span className="text-slate-400">SURVIVORS: </span>
                <strong className={survivorCount > 0 ? "text-emerald-400 font-semibold" : "text-slate-200"}>
                  {survivorCount} / 6
                </strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
