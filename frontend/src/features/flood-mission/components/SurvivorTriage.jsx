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
      className="survivor-triage-panel flex flex-col bg-[#0a0b10]/50 backdrop-blur-xl border border-white/10 rounded-[16px] overflow-hidden select-none shrink-0 shadow-[0_12px_36px_-4px_rgba(0,0,0,0.55),0_4px_12px_-2px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.14),inset_0_0_0_1px_rgba(255,255,255,0.05)]"
      aria-label="Survivors Detected"
    >
      {/* Panel Header */}
      <div className="triage-panel-header h-[36px] flex items-center justify-between px-3.5 bg-[#0e1018]/70 border-b border-white/[0.08] select-none shrink-0">
        <div className="flex items-center gap-2">
          <Users size={13} className="text-[#A1A1AA]" />
          <strong className="text-xs font-sans font-semibold uppercase tracking-[0.06em] text-[#F4F4F5]">
            SURVIVORS DETECTED
          </strong>
        </div>

        {/* 0 / 6 counter in section header */}
        <div className="flex items-center gap-1.5 font-sans text-[11px] text-[#A1A1AA]">
          <span
            className={`font-semibold font-mono text-xs tabular-nums ${
              detectedCount > 0 ? "text-emerald-400" : "text-[#F4F4F5]"
            }`}
          >
            {detectedCount}
          </span>
          <span className="text-[#71717A]">/</span>
          <span className="text-[#A1A1AA] font-mono text-xs tabular-nums">{maxSurvivors}</span>
        </div>
      </div>

      {/* Clean 2x3 Grid Container */}
      <div className="manifest-grid grid grid-cols-2 gap-2.5 p-3 bg-transparent">
        {slots.map(({ index, person, isDetected }) => {
          const gridBox = isDetected ? getGridBox(person.x, person.y) : null;
          const isSelected = isDetected && selectedSurvivorId === person.id;
          const targetId = `T-${String(index).padStart(2, "0")}`;

          return (
            <div
              key={`target-${index}`}
              className={`rounded-[10px] px-3.5 py-2.5 flex items-center justify-between transition-all select-none ${
                isSelected
                  ? "bg-[#161b26]/90 border border-cyan-400/60 shadow-[0_0_16px_rgba(6,182,212,0.25),inset_0_1px_0_rgba(6,182,212,0.35)] cursor-pointer"
                  : isDetected
                  ? "bg-emerald-950/30 hover:bg-emerald-950/45 border border-emerald-500/40 shadow-[0_0_14px_rgba(16,185,129,0.15),inset_0_1px_0_rgba(16,185,129,0.25)] cursor-pointer"
                  : "bg-black/45 hover:bg-black/60 border border-white/[0.07] hover:border-white/[0.14] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] cursor-default"
              }`}
              onClick={() => isDetected && onSelectSurvivor && onSelectSurvivor(person)}
              title={
                isDetected
                  ? `Target #${index} localized at grid ${gridBox}. Click to highlight on SLAM map.`
                  : `Target #${index} not detected`
              }
            >
              {/* Left: A vertical status bar + Target ID */}
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`w-1 h-3.5 rounded-full shrink-0 transition-colors ${
                    isSelected
                      ? "bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                      : isDetected
                      ? "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.7)]"
                      : "bg-zinc-700/60"
                  }`}
                />
                <span
                  className={`font-mono text-xs font-semibold ${
                    isSelected ? "text-cyan-200" : isDetected ? "text-emerald-300" : "text-[#E4E4E7]"
                  }`}
                >
                  {targetId}
                </span>
              </div>

              {/* Right: Single clean coordinate/state readout */}
              {isDetected ? (
                <span className="font-mono text-[11px] font-semibold text-emerald-400 tabular-nums">
                  {gridBox ? `Grid ${gridBox}` : "Detected"}
                </span>
              ) : (
                <span className="font-mono text-[11px] text-[#71717A]">
                  Not Detected
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
