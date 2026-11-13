"use client";

import React from "react";
import { Users } from "lucide-react";
import { getGridBox } from "./Tactical2DMap";

export default function SurvivorTriage({
  people = [],
  maxSurvivors = 6,
  onSelectSurvivor,
  selectedSurvivorId,
}) {
  const detectedCount = people.length;

  const slots = Array.from({ length: maxSurvivors }, (_, index) => {
    const person = people[index] || null;
    return {
      index: index + 1,
      person,
      isDetected: Boolean(person),
    };
  });

  return (
    <section
      className="survivor-triage-panel flex flex-col bg-[#0C1017] border border-white/[0.06] rounded-sm overflow-hidden select-none"
      aria-label="Survivor Localization Manifest"
    >
      {/* 3. Section Header with Clean Monospace Fraction */}
      <div className="triage-panel-header h-8 flex items-center justify-between px-3 bg-[#0E131C] border-b border-white/[0.06] select-none">
        <div className="flex items-center gap-2">
          <Users size={13} className="text-amber-400/80" />
          <strong className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-200">
            SURVIVOR LOCALIZATION MANIFEST
          </strong>
        </div>

        {/* 0 / 6 DETECTED counter in section header as clean monospace fraction */}
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <span
            className={`font-semibold tabular-nums ${
              detectedCount > 0 ? "text-emerald-400" : "text-slate-200"
            }`}
          >
            {detectedCount}
          </span>
          <span className="text-slate-400">/</span>
          <span className="text-slate-300 tabular-nums">{maxSurvivors}</span>
          <span className="text-[10px] uppercase tracking-widest text-slate-400 ml-1">
            DETECTED
          </span>
        </div>
      </div>

      {/* 1 & 2. Sleek 2-Column Tactical Manifest List with 1px dividers */}
      <div className="manifest-grid grid grid-cols-2 gap-px bg-white/[0.04]">
        {slots.map(({ index, person, isDetected }) => {
          const gridBox = isDetected ? getGridBox(person.x, person.y) : "---";
          const isSelected = isDetected && selectedSurvivorId === person.id;
          const targetId = `T-${String(index).padStart(2, "0")}`;

          return (
            <div
              key={`target-${index}`}
              className={`h-11 px-3 flex items-center justify-between transition-colors select-none ${
                isSelected
                  ? "bg-[#111c2a] border-l border-cyan-400"
                  : isDetected
                  ? "bg-[#0C1017] hover:bg-[#111722] border-l border-emerald-500 cursor-pointer"
                  : "bg-[#0C1017] hover:bg-[#0f141d] border-l border-transparent cursor-default"
              }`}
              onClick={() => isDetected && onSelectSurvivor && onSelectSurvivor(person)}
              title={
                isDetected
                  ? `Target #${index} localized at grid ${gridBox}. Click to highlight on SLAM map.`
                  : `Target #${index} scanning zone...`
              }
            >
              {/* Left: Status indicator dot + Target ID */}
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isDetected
                      ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)] animate-pulse"
                      : "bg-slate-500"
                  }`}
                />
                <span className="font-mono text-xs font-medium text-slate-200 tracking-wide">
                  {targetId}
                </span>
              </div>

              {/* Center: Grid coordinate readout */}
              <div className="flex items-center justify-center px-1">
                <span
                  className={`font-mono text-xs tabular-nums ${
                    isDetected ? "text-cyan-400 font-semibold" : "text-slate-400"
                  }`}
                >
                  {gridBox}
                </span>
              </div>

              {/* Right: Compact status text */}
              <div className="flex items-center justify-end">
                {isDetected ? (
                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-[2px] border border-emerald-500/30 font-semibold inline-flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-emerald-400" />
                    LOCKED
                  </span>
                ) : (
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    SCANNING
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
