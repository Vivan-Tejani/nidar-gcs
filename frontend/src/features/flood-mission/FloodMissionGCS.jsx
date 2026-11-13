"use client";

import React, { useEffect, useRef, useState } from "react";
import Head from "next/head";
import {
  Play,
  ShieldAlert,
  Battery,
  AlertTriangle,
  X
} from "lucide-react";
import Tactical2DMap from "./components/Tactical2DMap";
import CameraHUD from "./components/CameraHUD";
import SurvivorTriage from "./components/SurvivorTriage";
import TelemetryStrip from "./components/TelemetryStrip";

const API = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";
const MISSION_ALTITUDE_M = 5;
const MISSION_SPEED_MPS = 3;

const PHASE_LABELS = {
  INITIALIZING: "INITIALIZING",
  TAKEOFF: "TAKEOFF",
  SURVEY: "SEARCHING INDOOR ZONE",
  RETURN: "ABORTING / RTL",
  LAND: "LANDING",
  COMPLETE: "MISSION COMPLETE",
  STOPPED: "MISSION ABORTED",
  ERROR: "SIMULATION ERROR",
};

export default function FloodMissionGCS() {
  const [mission, setMission] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cameraStamp, setCameraStamp] = useState(Date.now());
  const [expandedCamera, setExpandedCamera] = useState(false);
  const [groundSpeed, setGroundSpeed] = useState(null);
  const [localTrail, setLocalTrail] = useState([]);
  const [selectedSurvivorId, setSelectedSurvivorId] = useState(null);
  const speedSample = useRef(null);

  const active = mission && ["starting", "running", "returning"].includes(mission.status);
  const phase = mission?.state?.phase || (mission?.status === "starting" ? "INITIALIZING" : "STANDBY");
  const people = mission?.state?.people || [];
  const survivorCount = people.length;
  const phaseLabel = PHASE_LABELS[phase] || phase;
  const pose = mission?.state?.pose;

  // Heading calculation from pose.yaw
  const headingDegrees = Number.isFinite(pose?.yaw)
    ? ((Math.round((90 - (pose.yaw * 180) / Math.PI) % 360) + 360) % 360)
    : null;
  const heading = headingDegrees === null ? "—" : `${String(headingDegrees).padStart(3, "0")}°`;

  const battery = Number.isFinite(mission?.state?.battery_percent)
    ? `${Math.round(mission.state.battery_percent)}%`
    : "98%";

  // Initial check for existing active mission
  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/simulation/flood/active`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((data) => {
        if (cancelled || !data?.session_id) return;
        speedSample.current = null;
        setGroundSpeed(null);
        setMission((current) => (current?.session_id ? current : data));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Start autonomous mission
  const startMission = async () => {
    setBusy(true);
    setError("");
    setLocalTrail([]);
    try {
      const form = new FormData();
      form.append("altitude", String(MISSION_ALTITUDE_M));
      form.append("speed", String(MISSION_SPEED_MPS));
      form.append("realtime", "true");
      const response = await fetch(`${API}/simulation/flood/start`, { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Could not start the simulation");
      setGroundSpeed(null);
      speedSample.current = null;
      setMission({ ...data, state: { phase: "INITIALIZING", trail: [], people: [] } });
    } catch (e) {
      const message = e.message || "Could not connect to the simulation backend";
      if (/already active/i.test(message)) {
        try {
          const response = await fetch(`${API}/simulation/flood/active`, { cache: "no-store" });
          const activeMission = response.ok ? await response.json() : null;
          if (activeMission?.session_id) {
            speedSample.current = null;
            setGroundSpeed(null);
            setMission(activeMission);
            setError("");
            return;
          }
        } catch {
          // Keep original error
        }
      }
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  // Emergency safety abort
  const abortMission = async () => {
    if (!mission?.session_id) return;
    try {
      const response = await fetch(`${API}/simulation/flood/${mission.session_id}/stop`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Could not abort mission");
      setMission((current) => ({
        ...current,
        status: data.status,
        state: { ...current.state, phase: "STOPPED" },
      }));
    } catch (e) {
      setError(e.message || "Could not abort mission");
    }
  };

  // State polling interval while active
  useEffect(() => {
    if (!mission?.session_id) return undefined;
    if (!["starting", "running", "returning"].includes(mission.status)) return undefined;
    let cancelled = false;

    const poll = async () => {
      try {
        const response = await fetch(`${API}/simulation/flood/${mission.session_id}/state`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Lost simulation connection");

        if (!cancelled) {
          if (data.status === "failed" && data.error) setError(data.error);
          const state = data.state;
          const currentPose = state?.pose;

          // Update local 2D trail history
          if (currentPose && Number.isFinite(currentPose.x) && Number.isFinite(currentPose.y)) {
            setLocalTrail((prev) => {
              const last = prev[prev.length - 1];
              if (!last || Math.hypot(currentPose.x - last.x, currentPose.y - last.y) >= 0.3) {
                return [...prev, { x: currentPose.x, y: currentPose.y, z: currentPose.z }];
              }
              return prev;
            });

            // Calculate instantaneous ground speed
            if (Number.isFinite(state?.sim_time)) {
              const previous = speedSample.current;
              const currentSample = {
                sessionId: data.session_id,
                simTime: state.sim_time,
                x: currentPose.x,
                y: currentPose.y,
              };

              if (previous?.sessionId !== data.session_id) {
                setGroundSpeed(null);
                speedSample.current = currentSample;
              } else if (state.sim_time > previous.simTime) {
                const deltaTime = state.sim_time - previous.simTime;
                if (deltaTime >= 0.05) {
                  setGroundSpeed(Math.hypot(currentPose.x - previous.x, currentPose.y - previous.y) / deltaTime);
                  speedSample.current = currentSample;
                }
              }
            }
          }

          setMission((current) => ({ ...current, ...data }));
        }
      } catch (e) {
        if (!cancelled && /session not found/i.test(e.message || "")) {
          try {
            const response = await fetch(`${API}/simulation/flood/active`, { cache: "no-store" });
            const activeMission = response.ok ? await response.json() : null;
            if (cancelled) return;
            if (activeMission?.session_id) {
              speedSample.current = null;
              setGroundSpeed(null);
              setMission((current) => (current?.session_id === mission.session_id ? activeMission : current));
              setError("");
            } else {
              setMission((current) => (current?.session_id === mission.session_id ? null : current));
              setGroundSpeed(null);
              speedSample.current = null;
              setError("The previous simulation session was cleared. Start the mission again.");
            }
          } catch {
            if (!cancelled) setError("Lost simulation connection. Check that the backend is running, then retry.");
          }
        } else if (!cancelled) {
          setError(e.message || "Lost simulation connection");
        }
      }
      if (!cancelled) setCameraStamp(Date.now());
    };

    poll();
    const timer = window.setInterval(poll, 600);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [mission?.session_id, mission?.status]);

  // Handle escape to close expanded camera
  useEffect(() => {
    if (!expandedCamera) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setExpandedCamera(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [expandedCamera]);

  return (
    <main className="gcs-root-frame">
      <Head>
        <title>PHOENIX GCS · Autonomous Mission Control</title>
        <meta
          name="description"
          content="Phoenix GCS autonomous indoor search, mapping and survivor localization ground control station."
        />
      </Head>

      {/* 1. Header Navigation & Tactical Master Controls */}
      <header className="gcs-top-bar h-12 flex items-center justify-between px-4 bg-[#0C1017] border-b border-white/5 z-40 select-none" aria-label="GCS Header">
        {/* Left Side Group */}
        <div className="flex items-center gap-3">
          {/* Phoenix GCS Branding */}
          <div className="brand-cluster flex items-center gap-2">
            <img className="phoenix-emblem w-7 h-7 object-contain" src="/phoenix-bird.png" alt="Phoenix bird emblem" />
            <div className="phoenix-wordmark flex flex-col leading-none">
              <strong className="text-sm font-extrabold tracking-wider text-white">PHOENIX <span className="text-amber-500">GCS</span></strong>
              <small className="text-[8px] font-bold tracking-widest text-slate-400">GROUND CONTROL STATION</small>
            </div>
          </div>

          {/* Hairline Divider */}
          <div className="h-4 w-[1px] bg-white/10" />

          {/* Drone Callsign */}
          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-[10px] uppercase tracking-widest text-slate-400">AIRCRAFT</span>
            <span className="text-xs font-semibold tracking-wider text-slate-200">DHRUVA-01</span>
          </div>

          {/* Hairline Divider */}
          <div className="h-4 w-[1px] bg-white/10" />

          {/* Status Pills: Local RF Link & Battery */}
          <div className="flex items-center gap-2">
            {/* Local RF Link Status Pill */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-[#111722] border border-white/5 text-[10px] font-mono">
              <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-slate-500"}`} />
              <span className="text-slate-400">RF LINK</span>
              <span className={active ? "text-emerald-400 font-medium" : "text-slate-400"}>
                {active ? "ONLINE" : "STANDBY"}
              </span>
            </div>

            {/* Battery Status Pill */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-[#111722] border border-white/5 text-[10px] font-mono">
              <Battery size={11} className={active ? "text-cyan-400" : "text-slate-400"} />
              <span className="text-slate-400">BATT</span>
              <span className="text-slate-200 font-medium">{battery}</span>
            </div>
          </div>
        </div>

        {/* Center-Right: Tactical Trigger & Partner Logo */}
        <div className="flex items-center gap-3">
          {active ? (
            <button
              type="button"
              className="h-8 px-4 rounded-sm bg-red-500/15 border border-red-500/60 text-red-400 uppercase tracking-wider text-xs font-mono font-semibold hover:bg-red-500 hover:text-white transition-colors inline-flex items-center gap-2"
              onClick={abortMission}
              aria-label="Emergency Stop and Abort Mission"
            >
              <ShieldAlert size={14} />
              <span>EMERGENCY ABORT</span>
            </button>
          ) : (
            <button
              type="button"
              className="h-8 px-4 rounded-sm bg-amber-500/15 border border-amber-500/60 text-amber-400 uppercase tracking-wider text-xs font-mono font-semibold hover:bg-amber-500 hover:text-black transition-colors inline-flex items-center gap-2"
              onClick={startMission}
              disabled={busy}
              aria-label="Arm and Start Autonomous Mission"
            >
              {busy ? (
                <span className="w-3 h-3 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin" />
              ) : (
                <Play size={12} className="fill-current" />
              )}
              <span>{busy ? "INITIALIZING..." : "ARM & START MISSION"}</span>
            </button>
          )}

          {/* Hairline Divider */}
          <div className="h-4 w-[1px] bg-white/10" />

          {/* Dhruva Banner Logo */}
          <img
            className="h-7 w-auto max-w-[170px] object-contain opacity-90 hover:opacity-100 transition-opacity"
            src="/dhruva-logo.png"
            alt="DHRUVA - Disaster Handling, Rescue & Unmanned Vigilance Aircraft"
          />
        </div>
      </header>

      {/* 2. Main Operational Workspace (Single-page 2-pane view) */}
      <div className="gcs-workspace-grid">
        {/* Left Pane (45%): Camera HUD + Survivor Triage */}
        <div className="workspace-left-pane">
          <CameraHUD
            sessionId={mission?.session_id}
            stamp={cameraStamp}
            active={active}
            expanded={expandedCamera}
            onToggleExpand={() => setExpandedCamera(!expandedCamera)}
            apiBase={API}
            altitude={pose?.z || 0}
            speed={groundSpeed || 0}
            survivorCount={survivorCount}
          />

          <SurvivorTriage
            people={people}
            maxSurvivors={6}
            selectedSurvivorId={selectedSurvivorId}
            onSelectSurvivor={(person) => setSelectedSurvivorId(person.id)}
          />
        </div>

        {/* Right Pane (55%): 2D Tactical Indoor SLAM & Grid Map */}
        <div className="workspace-right-pane">
          <Tactical2DMap
            pose={pose}
            trail={localTrail}
            people={people}
            active={active}
            coveragePercent={mission?.state?.coverage_percent || 0}
            selectedSurvivorId={selectedSurvivorId}
            onSelectSurvivor={(person) => setSelectedSurvivorId(person.id)}
          />
        </div>
      </div>

      {/* Error Alert Overlay */}
      {error && (
        <div className="gcs-error-toast" role="alert">
          <AlertTriangle size={16} className="error-icon" />
          <div className="error-message-content">
            <strong className="error-title">SYSTEM NOTICE</strong>
            <p className="error-desc">{error}</p>
          </div>
          <button
            type="button"
            className="btn-dismiss-error"
            onClick={() => setError("")}
            aria-label="Dismiss error notification"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 3. Bottom Aerospace Telemetry Bar */}
      <TelemetryStrip
        phaseLabel={phaseLabel}
        simTime={mission?.state?.sim_time || 0}
        altitude={pose?.z || 0}
        survivorCount={survivorCount}
        groundSpeed={groundSpeed}
        heading={heading}
        battery={battery}
        active={active}
        status={mission?.status || "idle"}
      />
    </main>
  );
}
