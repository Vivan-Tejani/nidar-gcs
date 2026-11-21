"use client";

import React from "react";
import { Camera, Maximize2, Minimize2 } from "lucide-react";

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
  // Forward-facing flight camera only
  const src = sessionId && !sessionId.startsWith("armed-") && !sessionId.startsWith("local-")
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
      className={`camera-hud-card bg-[#0a0b10]/50 backdrop-blur-xl border border-white/10 rounded-[16px] overflow-hidden shadow-[0_12px_36px_-4px_rgba(0,0,0,0.55),0_4px_12px_-2px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.14),inset_0_0_0_1px_rgba(255,255,255,0.05)] ${
        expanded ? "camera-hud-expanded" : ""
      }`}
      aria-label="Forward Optical Feed Viewport"
    >
      {/* 1. Slim Panel Header (36px) */}
      <div className="camera-card-header h-[36px] flex items-center justify-between px-3.5 bg-[#0e1018]/70 border-b border-white/[0.08] select-none">
        <div className="flex items-center gap-2">
          {/* Status Dot */}
          <span
            className={`w-2 h-2 rounded-full ${
              active ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" : "bg-[#52525B]"
            }`}
          />
          {/* Crisp 12px sans-serif title */}
          <strong className="text-xs font-sans font-semibold tracking-[0.06em] uppercase text-[#F4F4F5]">
            FORWARD OPTICAL FEED
          </strong>
        </div>

        {/* Minimalist action buttons on the right */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="w-7 h-7 flex items-center justify-center rounded-[7px] text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-white/10 active:scale-95 transition-all border-0 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            onClick={handleSnapshot}
            disabled={!src}
            title="Export Frame Snapshot"
            aria-label="Snapshot"
          >
            <Camera size={14} />
          </button>

          <button
            type="button"
            className="w-7 h-7 flex items-center justify-center rounded-[7px] text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-white/10 active:scale-95 transition-all border-0 cursor-pointer"
            onClick={onToggleExpand}
            title={expanded ? "Exit Fullscreen" : "Expand Viewport"}
            aria-label={expanded ? "Restore Camera" : "Expand Camera"}
          >
            {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* 2. Precision Optical Viewport */}
      <div className="camera-viewport-body relative w-full h-full min-h-0 bg-transparent overflow-hidden flex items-center justify-center">
        {/* Subtle HUD Framing Brackets */}
        <div className="pointer-events-none absolute inset-3 flex flex-col justify-between">
          <div className="flex justify-between">
            <span className="w-2.5 h-2.5 border-t border-l border-white/20 rounded-tl-[2px]" />
            <span className="w-2.5 h-2.5 border-t border-r border-white/20 rounded-tr-[2px]" />
          </div>
          <div className="flex justify-between">
            <span className="w-2.5 h-2.5 border-b border-l border-white/20 rounded-bl-[2px]" />
            <span className="w-2.5 h-2.5 border-b border-r border-white/20 rounded-br-[2px]" />
          </div>
        </div>

        {src ? (
          <img
            src={src}
            alt="Drone forward optical feed stream"
            className="w-full h-full object-contain block select-none"
          />
        ) : (
          <div className="px-4 py-2 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-xs font-mono text-zinc-300 shadow-[0_4px_20px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] flex items-center gap-2 select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400/90 animate-pulse" />
            <span>Awaiting camera feed</span>
          </div>
        )}
      </div>
    </section>
  );
}
