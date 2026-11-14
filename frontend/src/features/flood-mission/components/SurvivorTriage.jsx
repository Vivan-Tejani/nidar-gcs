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
      className="survivor-triage-panel flex flex-col bg-[#0a0b10]/40 backdrop-blur-xl border border-white/10 rounded-[4px] overflow-hidden select-none shrink-0"
      aria-label="Survivors Detected"
    >
      {/* Panel Header */}
      <div className="triage-panel-header h-8 flex items-center justify-between px-3 bg-[#0a0b10]/60 border-b border-white/10 select-none shrink-0">
        <div className="flex items-center gap-2">
          <Users size={13} className="text-[#A1A1AA]" />
          <strong className="text-[11px] font-sans font-semibold uppercase tracking-[0.06em] text-[#A1A1AA]">
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
      <div className="manifest-grid grid grid-cols-2 gap-1.5 p-2.5 bg-transparent">
        {slots.map(({ index, person, isDetected }) => {
          const gridBox = isDetected ? getGridBox(person.x, person.y) : null;
          const isSelected = isDetected && selectedSurvivorId === person.id;
          const targetId = `T-${String(index).padStart(2, "0")}`;

          return (
            <div
              key={`target-${index}`}
              className={`rounded-[3px] px-3 py-2 flex items-center justify-between transition-colors select-none ${
                isSelected
                  ? "bg-[#18181F]/90 border border-cyan-400/60 shadow-[0_0_12px_rgba(6,182,212,0.25)] cursor-pointer"
                  : isDetected
                  ? "bg-black/60 hover:bg-black/75 border border-emerald-500/40 cursor-pointer"
                  : "bg-black/45 border border-white/10 hover:border-white/20 cursor-default"
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
                  className={`w-[3px] h-4 rounded-full shrink-0 transition-colors ${
                    isDetected
                      ? "bg-[#10B981] shadow-[0_0_6px_rgba(16,185,129,0.5)]"
                      : "bg-[#27272A]"
                  }`}
                />
                <span className="font-mono text-xs font-semibold text-[#E4E4E7]">
                  {targetId}
                </span>
              </div>

              {/* Right: Single clean coordinate/state readout */}
              {isDetected ? (
                <span className="font-mono text-[11px] font-semibold text-emerald-400 tabular-nums">
                  Detected
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
