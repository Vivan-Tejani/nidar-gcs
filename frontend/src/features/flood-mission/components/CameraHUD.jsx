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
      className={`camera-hud-card bg-[#0a0b10]/40 backdrop-blur-xl border border-white/10 rounded-[4px] overflow-hidden ${
        expanded ? "camera-hud-expanded" : ""
      }`}
      aria-label="Forward Optical Feed Viewport"
    >
      {/* 1. Slim Panel Header (32px / h-8) */}
      <div className="camera-card-header h-8 flex items-center justify-between px-3 bg-[#0a0b10]/60 border-b border-white/10 select-none">
        <div className="flex items-center gap-2">
          {/* 6px Single Status Dot */}
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              active ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" : "bg-[#52525B]"
            }`}
          />
          {/* Crisp 12px sans-serif title */}
          <strong className="text-xs font-sans font-semibold tracking-[0.06em] uppercase text-[#F4F4F5]">
            FORWARD OPTICAL FEED
          </strong>
        </div>

        {/* Minimalist action buttons on the right (w-6 h-6) */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="w-6 h-6 flex items-center justify-center rounded-[3px] text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-white/10 transition-colors border-0 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            onClick={handleSnapshot}
            disabled={!src}
            title="Export Frame Snapshot"
            aria-label="Snapshot"
          >
            <Camera size={14} />
          </button>

          <button
            type="button"
            className="w-6 h-6 flex items-center justify-center rounded-[3px] text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-white/10 transition-colors border-0 cursor-pointer"
            onClick={onToggleExpand}
            title={expanded ? "Exit Fullscreen" : "Expand Viewport"}
            aria-label={expanded ? "Restore Camera" : "Expand Camera"}
          >
            {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* 2. Plain Box Viewport: Awaiting Camera Feed */}
      <div className="camera-viewport-body relative w-full h-full min-h-0 bg-transparent overflow-hidden flex items-center justify-center">
        {src ? (
          <img
            src={src}
            alt="Drone forward optical feed stream"
            className="w-full h-full object-contain block select-none"
          />
        ) : (
          <div className="px-4 py-2 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs font-mono text-zinc-300 select-none">
            Awaiting camera feed
          </div>
        )}
      </div>
    </section>
  );
}
