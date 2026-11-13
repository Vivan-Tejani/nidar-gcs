"use client";

import React, { useMemo, useState, useRef } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Grid,
  Square,
  Activity,
} from "lucide-react";

// PyBullet synthetic world coordinate bounds
const ARENA_X_MIN = 0.0;
const ARENA_X_MAX = 40.0;
const ARENA_Y_MIN = -15.0;
const ARENA_Y_MAX = 15.0;

// Structural room layouts from flood_world.py
const OBSTACLES = [
  { x: 5.0, y: -10.0, w: 6.0, h: 5.0, label: "ROOM A1" },
  { x: 20.0, y: -2.0, w: 7.0, h: 5.0, label: "CENTRAL CORE" },
  { x: 5.0, y: 7.0, w: 6.0, h: 6.0, label: "ROOM B1" },
  { x: 11.0, y: 11.0, w: 3.0, h: 4.0, label: "SECTION C" },
  { x: 35.0, y: -10.0, w: 6.0, h: 5.0, label: "ROOM A2" },
  { x: 35.0, y: 7.0, w: 6.0, h: 6.0, label: "ROOM B2" },
  { x: 29.0, y: 11.0, w: 3.0, h: 4.0, label: "SECTION D" },
];

const ENTRY_PAD = { x: 20.0, y: -13.0, label: "LAUNCH PAD" };

// Calculate 15x15 alphanumeric grid coordinate (Rows A-O, Cols 01-15)
export function getGridBox(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return "N/A";
  const col = Math.min(
    14,
    Math.max(0, Math.floor(((x - ARENA_X_MIN) / (ARENA_X_MAX - ARENA_X_MIN)) * 15))
  );
  const row = Math.min(
    14,
    Math.max(0, Math.floor(((ARENA_Y_MAX - y) / (ARENA_Y_MAX - ARENA_Y_MIN)) * 15))
  );
  return `${String.fromCharCode(65 + row)}-${String(col + 1).padStart(2, "0")}`;
}

export default function Tactical2DMap({
  pose,
  trail = [],
  people = [],
  active = false,
  coveragePercent = 0,
  onSelectSurvivor,
  selectedSurvivorId,
}) {
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [showStructures, setShowStructures] = useState(true);
  const [showTrail, setShowTrail] = useState(true);
  const svgRef = useRef(null);

  // SVG coordinate dimensions
  const viewBoxWidth = 840;
  const viewBoxHeight = 640;
  const padding = 44;
  const innerWidth = viewBoxWidth - padding * 2;
  const innerHeight = viewBoxHeight - padding * 2;

  // Convert simulation coordinates to SVG coordinates
  const worldToSvg = useMemo(() => {
    return (x, y) => {
      const clampedX = Number.isFinite(x) ? x : ARENA_X_MIN;
      const clampedY = Number.isFinite(y) ? y : ARENA_Y_MIN;
      const normX = (clampedX - ARENA_X_MIN) / (ARENA_X_MAX - ARENA_X_MIN);
      const normY = (ARENA_Y_MAX - clampedY) / (ARENA_Y_MAX - ARENA_Y_MIN);
      return {
        x: padding + normX * innerWidth,
        y: padding + normY * innerHeight,
      };
    };
  }, [padding, innerWidth, innerHeight]);

  // Current drone location
  const droneSvgPos = useMemo(() => {
    if (!pose || !Number.isFinite(pose.x) || !Number.isFinite(pose.y)) {
      return worldToSvg(ENTRY_PAD.x, ENTRY_PAD.y);
    }
    return worldToSvg(pose.x, pose.y);
  }, [pose, worldToSvg]);

  // Heading rotation angle in degrees
  const headingDeg = useMemo(() => {
    if (!pose || !Number.isFinite(pose.yaw)) return 0;
    return (pose.yaw * 180) / Math.PI;
  }, [pose]);

  // Generate polyline string for drone trajectory
  const trailPointsString = useMemo(() => {
    if (!trail || trail.length === 0) return "";
    return trail
      .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
      .map((p) => {
        const svg = worldToSvg(p.x, p.y);
        return `${svg.x.toFixed(1)},${svg.y.toFixed(1)}`;
      })
      .join(" ");
  }, [trail, worldToSvg]);

  // Export tactical rescue map as an SVG file
  const handleExportMap = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgRef.current);

    if (!source.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `NIDAR_INDOOR_2D_MAP_${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:T]/g, "-")}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const cols = Array.from({ length: 15 }, (_, i) => String(i + 1).padStart(2, "0"));
  const rows = Array.from({ length: 15 }, (_, i) => String.fromCharCode(65 + i));

  return (
    <div className="tactical-map-container bg-[#0a0b10]/40 backdrop-blur-xl border border-white/10 rounded-[4px] overflow-hidden" aria-label="Tactical 2D Indoor SLAM Map">
      {/* 1. Header Toolbar with Integrated Inline Segmented Controls */}
      <div className="map-toolbar h-8 flex items-center justify-between px-3 bg-[#0a0b10]/60 border-b border-white/10 select-none">
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              active
                ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)] animate-pulse"
                : "bg-[#52525B]"
            }`}
          />
          <strong className="text-xs font-sans font-semibold uppercase tracking-[0.06em] text-[#F4F4F5]">
            2D INDOOR SLAM MAP
          </strong>
        </div>

        {/* Inline Compact Action & Layer Controls */}
        <div className="flex items-center gap-2 select-none">
          {/* Layer Toggles Segmented Group */}
          <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md p-0.5 rounded-[4px] border border-white/10">
            <button
              type="button"
              className={`h-6 px-3 flex items-center gap-1.5 text-xs font-sans font-semibold rounded-[3px] transition-all border cursor-pointer ${
                showGrid
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-400/50 shadow-[0_0_8px_rgba(6,182,212,0.25)]"
                  : "bg-transparent text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-white/10 border-transparent"
              }`}
              onClick={() => setShowGrid(!showGrid)}
              title="Toggle Modular Grid Overlay"
            >
              <Grid size={12} className={showGrid ? "text-cyan-400" : "text-[#A1A1AA]"} />
              <span>Grid</span>
            </button>

            <button
              type="button"
              className={`h-6 px-3 flex items-center gap-1.5 text-xs font-sans font-semibold rounded-[3px] transition-all border cursor-pointer ${
                showStructures
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-400/50 shadow-[0_0_8px_rgba(6,182,212,0.25)]"
                  : "bg-transparent text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-white/10 border-transparent"
              }`}
              onClick={() => setShowStructures(!showStructures)}
              title="Toggle Structural Rooms"
            >
              <Square size={12} className={showStructures ? "text-cyan-400" : "text-[#A1A1AA]"} />
              <span>Rooms</span>
            </button>

            <button
              type="button"
              className={`h-6 px-3 flex items-center gap-1.5 text-xs font-sans font-semibold rounded-[3px] transition-all border cursor-pointer ${
                showTrail
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-400/50 shadow-[0_0_8px_rgba(6,182,212,0.25)]"
                  : "bg-transparent text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-white/10 border-transparent"
              }`}
              onClick={() => setShowTrail(!showTrail)}
              title="Toggle Trajectory Trail"
            >
              <Activity size={12} className={showTrail ? "text-cyan-400" : "text-[#A1A1AA]"} />
              <span>Path</span>
            </button>
          </div>

          {/* Divider */}
          <div className="h-3.5 w-[1px] bg-white/10" />

          {/* Zoom Buttons Group */}
          <div className="flex items-center gap-0.5 bg-black/60 backdrop-blur-md p-0.5 rounded-[4px] border border-white/10">
            <button
              type="button"
              className="w-6 h-6 flex items-center justify-center text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-white/10 rounded-[2px] transition-colors border-0 bg-transparent cursor-pointer"
              onClick={() => setZoom((z) => Math.min(2.0, z + 0.2))}
              title="Zoom In"
            >
              <ZoomIn size={12} />
            </button>

            <button
              type="button"
              className="w-6 h-6 flex items-center justify-center text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-white/10 rounded-[2px] transition-colors border-0 bg-transparent cursor-pointer"
              onClick={() => setZoom((z) => Math.max(0.8, z - 0.2))}
              title="Zoom Out"
            >
              <ZoomOut size={12} />
            </button>

            <button
              type="button"
              className="w-6 h-6 flex items-center justify-center text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-white/10 rounded-[2px] transition-colors border-0 bg-transparent cursor-pointer"
              onClick={() => setZoom(1)}
              title="Reset Scale"
            >
              <RotateCcw size={12} />
            </button>
          </div>

          {/* Divider */}
          <div className="h-3.5 w-[1px] bg-white/10" />

          {/* Export Tactical Rescue Map */}
          <button
            type="button"
            className="h-6 flex items-center gap-1.5 px-2.5 text-xs font-sans font-medium text-[#E4E4E7] bg-black/60 hover:bg-white/15 border border-white/10 rounded-[3px] transition-colors cursor-pointer"
            onClick={handleExportMap}
            title="Export 2D Map for Ground Rescue Teams"
          >
            <Download size={12} />
            <span>Export Map</span>
          </button>
        </div>
      </div>

      {/* Map Canvas Wrapper */}
      <div className="map-canvas-wrapper relative w-full h-full min-h-0 bg-transparent overflow-hidden">
        {/* SVG Tactical Map Canvas */}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          className="tactical-svg w-full h-full block"
          preserveAspectRatio="xMidYMid meet"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "center center",
            transition: "transform 0.15s ease-out",
          }}
        >
          {/* Translucent Arena Boundary (replaces opaque canvas) */}
          <rect
            x={padding}
            y={padding}
            width={innerWidth}
            height={innerHeight}
            fill="rgba(5, 7, 12, 0.15)"
            stroke="rgba(255, 255, 255, 0.22)"
            strokeWidth="1"
          />

          {/* 2. Softened Modular Grid Overlay */}
          {showGrid && (
            <g className="grid-overlay-group">
              {/* Vertical Columns */}
              {cols.map((colName, i) => {
                const x = padding + (i / 15) * innerWidth;
                const isMajor = i % 5 === 0;
                return (
                  <g key={`col-${colName}`}>
                    <line
                      x1={x}
                      y1={padding}
                      x2={x}
                      y2={padding + innerHeight}
                      stroke={
                        isMajor
                          ? "rgba(255, 255, 255, 0.05)"
                          : "rgba(255, 255, 255, 0.025)"
                      }
                      strokeWidth="1"
                    />
                    <text
                      x={x + innerWidth / 30}
                      y={padding - 10}
                      textAnchor="middle"
                      fill="#71717A"
                      fontSize="10"
                      fontFamily="var(--font-mono), monospace"
                      fontWeight="600"
                    >
                      {colName}
                    </text>
                  </g>
                );
              })}

              {/* Horizontal Rows */}
              {rows.map((rowName, i) => {
                const y = padding + (i / 15) * innerHeight;
                const isMajor = i % 5 === 0;
                return (
                  <g key={`row-${rowName}`}>
                    <line
                      x1={padding}
                      y1={y}
                      x2={padding + innerWidth}
                      y2={y}
                      stroke={
                        isMajor
                          ? "rgba(255, 255, 255, 0.05)"
                          : "rgba(255, 255, 255, 0.025)"
                      }
                      strokeWidth="1"
                    />
                    <text
                      x={padding - 12}
                      y={y + innerHeight / 30 + 3}
                      textAnchor="middle"
                      fill="#71717A"
                      fontSize="10"
                      fontFamily="var(--font-mono), monospace"
                      fontWeight="600"
                    >
                      {rowName}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* 2. Structural Room Boundaries (Translucent Blueprint Style) */}
          {showStructures && (
            <g className="structures-group">
              {OBSTACLES.map((obs, idx) => {
                const topLeft = worldToSvg(obs.x - obs.w / 2, obs.y + obs.h / 2);
                const bottomRight = worldToSvg(obs.x + obs.w / 2, obs.y - obs.h / 2);
                const width = Math.abs(bottomRight.x - topLeft.x);
                const height = Math.abs(bottomRight.y - topLeft.y);

                return (
                  <g key={`obs-${idx}`}>
                    <rect
                      x={topLeft.x}
                      y={topLeft.y}
                      width={width}
                      height={height}
                      fill="rgba(14, 18, 26, 0.55)"
                      stroke="rgba(255, 255, 255, 0.30)"
                      strokeWidth="1"
                      rx="2"
                    />
                    <text
                      x={topLeft.x + width / 2}
                      y={topLeft.y + height / 2 + 3}
                      textAnchor="middle"
                      fill="#A1A1AA"
                      fontSize="11"
                      fontWeight="600"
                      letterSpacing="0.08em"
                      fontFamily="var(--font-sans), sans-serif"
                    >
                      {obs.label}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* Designated Launch & Entry Pad */}
          {(() => {
            const entrySvg = worldToSvg(ENTRY_PAD.x, ENTRY_PAD.y);
            return (
              <g className="entry-pad-group" transform={`translate(${entrySvg.x}, ${entrySvg.y})`}>
                <rect
                  x="-13"
                  y="-13"
                  width="26"
                  height="26"
                  fill="rgba(24, 28, 40, 0.75)"
                  stroke="rgba(255, 255, 255, 0.3)"
                  strokeWidth="1"
                  strokeDasharray="3 2"
                  rx="2"
                />
                <text
                  x="0"
                  y="4"
                  textAnchor="middle"
                  fill="#A1A1AA"
                  fontSize="10.5"
                  fontWeight="bold"
                  fontFamily="var(--font-mono), monospace"
                >
                  H
                </text>
                <text
                  x="0"
                  y="26"
                  textAnchor="middle"
                  fill="#71717A"
                  fontSize="9.5"
                  fontWeight="600"
                  letterSpacing="0.08em"
                  fontFamily="var(--font-sans), sans-serif"
                >
                  ENTRY/EXIT
                </text>
              </g>
            );
          })()}

          {/* Clean Drone Flight Path Trail */}
          {showTrail && trailPointsString && (
            <polyline
              points={trailPointsString}
              fill="none"
              stroke="#06B6D4"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.85"
            />
          )}

          {/* Tagged Survivor Markers */}
          <g className="survivors-group">
            {people.map((person, index) => {
              const pos = worldToSvg(person.x, person.y);
              const gridTag = getGridBox(person.x, person.y);
              const isSelected = selectedSurvivorId === person.id;

              return (
                <g
                  key={`person-${person.id || index}`}
                  className="survivor-pin"
                  transform={`translate(${pos.x}, ${pos.y})`}
                  onClick={() => onSelectSurvivor && onSelectSurvivor(person)}
                  style={{ cursor: "pointer" }}
                >
                  {/* Subtle Selection Pulse Ring */}
                  {isSelected && (
                    <circle
                      r="14"
                      fill="none"
                      stroke="#06B6D4"
                      strokeWidth="1.5"
                      strokeDasharray="3,2"
                    />
                  )}

                  {/* Survivor Badge Pin */}
                  <circle
                    r="8"
                    fill="#10B981"
                    stroke="#ffffff"
                    strokeWidth="1.2"
                  />
                  <text
                    x="0"
                    y="3"
                    textAnchor="middle"
                    fill="#042F2E"
                    fontSize="9.5"
                    fontWeight="800"
                    fontFamily="var(--font-mono), monospace"
                  >
                    {index + 1}
                  </text>

                  {/* Grid Box Callout Pill */}
                  <g transform="translate(11, -11)">
                    <rect
                      x="0"
                      y="-10"
                      width="46"
                      height="16"
                      rx="2"
                      fill="#111113"
                      stroke="#222227"
                      strokeWidth="1"
                    />
                    <text
                      x="23"
                      y="1.5"
                      textAnchor="middle"
                      fill="#10B981"
                      fontSize="9.5"
                      fontWeight="bold"
                      fontFamily="var(--font-mono), monospace"
                    >
                      {gridTag}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>

          {/* Autonomous Drone Glyph */}
          <g className="drone-glyph" transform={`translate(${droneSvgPos.x}, ${droneSvgPos.y})`}>
            {/* Rotated Drone Body */}
            <g transform={`rotate(${headingDeg})`}>
              {/* Quad Arms */}
              <line x1="-9" y1="-9" x2="9" y2="9" stroke="#71717A" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="9" y1="-9" x2="-9" y2="9" stroke="#71717A" strokeWidth="1.8" strokeLinecap="round" />

              {/* Rotors */}
              <circle cx="-9" cy="-9" r="3" fill="#F97316" stroke="#ffffff" strokeWidth="0.8" />
              <circle cx="9" cy="-9" r="3" fill="#F97316" stroke="#ffffff" strokeWidth="0.8" />
              <circle cx="-9" cy="9" r="3" fill="#3F3F46" stroke="#ffffff" strokeWidth="0.8" />
              <circle cx="9" cy="9" r="3" fill="#3F3F46" stroke="#ffffff" strokeWidth="0.8" />

              {/* Drone Core */}
              <circle cx="0" cy="0" r="4" fill="#F97316" stroke="#ffffff" strokeWidth="1" />

              {/* Heading Direction Nose */}
              <polygon points="0,-14 3,-7 -3,-7" fill="#F97316" />
            </g>

            {/* Drone Position Readout - Offset to top-right of drone to prevent overlap */}
            <g transform="translate(16, -16)">
              <rect
                x="0"
                y="-10"
                width="78"
                height="16"
                rx="2"
                fill="#111113"
                stroke="#222227"
                strokeWidth="0.8"
              />
              <text
                x="5"
                y="1.5"
                fill="#F4F4F5"
                fontSize="8.5"
                fontWeight="bold"
                fontFamily="var(--font-mono), monospace"
              >
                {pose?.x ? pose.x.toFixed(1) : "0.0"}, {pose?.y ? pose.y.toFixed(1) : "0.0"}m
              </text>
            </g>
          </g>
        </svg>

        {/* 3. Floating Map Legend (Bottom-Left Translucent Overlay) */}
        <div className="absolute bottom-3 left-3 z-20 bg-black/65 backdrop-blur-md border border-white/10 px-3 py-1.5 text-xs font-sans text-[#A1A1AA] rounded-[3px] flex items-center gap-3 select-none pointer-events-none">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F97316] shrink-0" />
            <span>Drone</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>Survivor</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-[1px] bg-black/60 border border-white/20 shrink-0" />
            <span>Room</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-[2px] bg-cyan-400 shrink-0" />
            <span>Flight Path</span>
          </div>
        </div>
      </div>
    </div>
  );
}
