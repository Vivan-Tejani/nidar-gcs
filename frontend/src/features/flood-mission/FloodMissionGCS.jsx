"use client";

import React, { useEffect, useRef, useState } from "react";
import Head from "next/head";
import {
  Play,
  Square,
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
  const [aborting, setAborting] = useState(false);
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
    : "--";

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

  // Auto-dismiss transient error notice after 4 seconds
  useEffect(() => {
    if (!error) return undefined;
    const timer = setTimeout(() => setError(""), 4000);
    return () => clearTimeout(timer);
  }, [error]);

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
      const message = e.message || "";
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

      // Drone is not connected: show error message at bottom, do not change button or move drone
      setError("Nothing is connected");
    } finally {
      setBusy(false);
    }
  };

  // Emergency safety abort
  const abortMission = async () => {
    if (!mission?.session_id) return;
    setAborting(true);
    try {
      const response = await fetch(`${API}/simulation/flood/${mission.session_id}/stop`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Could not abort mission");
      setMission((current) => ({
        ...current,
        status: data.status || "stopped",
        state: { ...current?.state, phase: "STOPPED" },
      }));
    } catch (e) {
      setError(e.message || "Could not abort mission");
    } finally {
      setAborting(false);
    }
  };

  // State polling interval while active (backend mode)
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

  // Real-time automatic background wallpaper hot-reload
  const [isVideoBg, setIsVideoBg] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        return sessionStorage.getItem("gcs_bg_is_video") === "1";
      } catch {
        return false;
      }
    }
    return false;
  });
  const [bgSrc, setBgSrc] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem("gcs_bg_src");
        if (cached) return cached;
      } catch {}
    }
    return "/api/background";
  });
  const lastVersionRef = useRef(null);

  useEffect(() => {
    let active = true;
    const checkBg = async () => {
      try {
        const res = await fetch(`/api/background?info=1&_t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          if (active && data.version) {
            const isVideo = Boolean(data.isVideo || data.type === "video");
            const newSrc = `/api/background?v=${data.version}`;
            try {
              sessionStorage.setItem("gcs_bg_is_video", isVideo ? "1" : "0");
              sessionStorage.setItem("gcs_bg_src", newSrc);
            } catch {}

            if (lastVersionRef.current === null) {
              lastVersionRef.current = data.version;
              setIsVideoBg(isVideo);
              setBgSrc(newSrc);
            } else if (lastVersionRef.current !== data.version) {
              lastVersionRef.current = data.version;
              setIsVideoBg(isVideo);
              setBgSrc(newSrc);
            }
          }
        }
      } catch {}
    };

    checkBg();
    const interval = setInterval(checkBg, 1500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <>
      <Head>
        <title>DJS Phoenix GCS · Autonomous Mission Control</title>
        <meta
          name="description"
          content="DJS Phoenix GCS autonomous indoor search, mapping and survivor localization ground control station."
        />
      </Head>

      {/* Fixed Hardware-Accelerated Wallpaper Layer: Sits above body (z-0), beneath UI (z-10) */}
      <div
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
        style={{ filter: "brightness(0.8)" }}
        aria-hidden="true"
      >
        {isVideoBg ? (
          <video
            key={bgSrc}
            ref={(el) => {
              if (el) {
                el.muted = true;
                el.play().catch(() => {});
              }
            }}
            src={bgSrc}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover object-center block"
          />
        ) : (
          <img
            key={bgSrc}
            src={bgSrc}
            alt="Mission Control Background"
            className="w-full h-full object-cover object-center block"
            loading="eager"
          />
        )}
      </div>

      <main className="gcs-root-frame p-2.5 gap-2.5 relative z-10">
        {/* 1. Header Navigation & Tactical Master Controls */}
      <header className="gcs-top-bar h-12 flex items-center justify-between px-2 bg-transparent border-none shadow-none z-40 select-none" aria-label="GCS Header">
        {/* Left Side Group */}
        <div className="flex items-center gap-3">
          {/* DJS Phoenix GCS Branding */}
          <div className="brand-cluster flex items-center gap-2.5">
            <img className="phoenix-emblem w-8 h-8 object-contain" src="/phoenix-bird.png" alt="DJS Phoenix bird emblem" />
            <div className="phoenix-wordmark flex items-center leading-none">
              <strong className="text-[17px] font-extrabold tracking-wider text-[#F4F4F5]">DJS Phoenix <span className="text-[#F97316]">GCS</span></strong>
            </div>
          </div>
        </div>

        {/* Center-Right: Solid High-Contrast Hardware Trigger */}
        <div className="flex items-center gap-3">
          {active ? (
            <button
              type="button"
              className="bg-[#EF4444] hover:bg-[#DC2626] text-white font-sans font-semibold text-xs px-4 h-8 rounded-[8px] shadow-[0_2px_14px_rgba(239,68,68,0.35),inset_0_1px_0_rgba(255,255,255,0.3)] border border-red-400/40 transition-all active:scale-[0.98] inline-flex items-center gap-2 cursor-pointer"
              onClick={abortMission}
              disabled={aborting}
              aria-label="Abort Mission"
            >
              {aborting ? (
                <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <Square size={11} className="fill-current text-white" />
              )}
              <span>{aborting ? "ABORTING..." : "ABORT MISSION"}</span>
            </button>
          ) : (
            <button
              type="button"
              className="bg-[#F97316] hover:bg-[#EA580C] text-[#09090B] font-sans font-semibold text-xs px-4 h-8 rounded-[8px] shadow-[0_2px_14px_rgba(249,115,22,0.35),inset_0_1px_0_rgba(255,255,255,0.3)] border border-orange-400/40 transition-all active:scale-[0.98] inline-flex items-center gap-2 cursor-pointer"
              onClick={startMission}
              disabled={busy}
              aria-label="Start Mission"
            >
              {busy ? (
                <span className="w-3 h-3 rounded-full border-2 border-[#09090B]/30 border-t-[#09090B] animate-spin" />
              ) : (
                <Play size={12} className="fill-current text-[#09090B]" />
              )}
              <span>{busy ? "INITIALIZING..." : "START MISSION"}</span>
            </button>
          )}
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
  </>
);
}
