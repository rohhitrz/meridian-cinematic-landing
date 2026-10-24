"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DESKTOP_MQ, prefersReducedMotion, useMediaQuery } from "@/lib/motion";
import styles from "./VideoPlayer.module.css";

const fmt = (t: number) => {
  if (!isFinite(t) || t < 0) t = 0;
  return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
};

interface Props {
  src: string;
  title: string;
  open: boolean;
  onClose: () => void;
}

/**
 * Modal film player. Desktop: custom chrome (play, scrub, time, mute, volume,
 * fullscreen) that auto-hides while playing. Phones: a plain native player.
 * Esc closes, Space toggles, F fullscreen, arrows seek ±5s on the scrubber.
 */
export function VideoPlayer({ src, title, open, onClose }: Props) {
  const desktop = useMediaQuery(DESKTOP_MQ);
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scrubRef = useRef<HTMLDivElement>(null);
  const volRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [muted, setMuted] = useState(false);
  const [vol, setVol] = useState(1);
  const [idle, setIdle] = useState(false);
  const idleT = useRef(0);
  const dur500 = prefersReducedMotion() ? 120 : 500;

  // mount → next frame show (transition in); close → transition out → unmount
  useEffect(() => {
    if (open) {
      setMounted(true);
      const lastFocus = document.activeElement as HTMLElement | null;
      document.documentElement.style.overflow = "hidden";
      const r = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      const t = window.setTimeout(() => {
        videoRef.current?.play().catch(() => {});
        closeRef.current?.focus();
      }, dur500);
      return () => {
        cancelAnimationFrame(r);
        clearTimeout(t);
        lastFocus?.focus?.();
      };
    }
    setShown(false);
    videoRef.current?.pause();
    const t = window.setTimeout(() => {
      setMounted(false);
      document.documentElement.style.overflow = "";
    }, dur500);
    return () => clearTimeout(t);
  }, [open, dur500]);

  const poke = useCallback(() => {
    setIdle(false);
    clearTimeout(idleT.current);
    idleT.current = window.setTimeout(() => setIdle(true), 2600);
  }, []);

  const toggle = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
    poke();
  }, [poke]);

  const toggleFs = useCallback(() => {
    const el = rootRef.current?.querySelector<HTMLElement>("[data-frame]");
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else el.requestFullscreen?.().catch(() => {});
  }, []);

  const seekTo = useCallback((ratio: number) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    v.currentTime = Math.min(1, Math.max(0, ratio)) * v.duration;
    setTime(v.currentTime);
  }, []);

  const setVolume = useCallback((p: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = Math.min(1, Math.max(0, p));
    v.muted = v.volume === 0;
    setVol(v.volume);
    setMuted(v.muted);
  }, []);

  // keyboard: Esc / Space / F, and a focus trap inside the dialog
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onClose();
      const inSlider = document.activeElement === scrubRef.current || document.activeElement === volRef.current;
      if (e.key === " " && !inSlider && (document.activeElement as HTMLElement)?.tagName !== "BUTTON") {
        e.preventDefault();
        toggle();
      }
      if (e.key === "f" || e.key === "F") toggleFs();
      if (e.key === "Tab" && rootRef.current) {
        const f = Array.from(rootRef.current.querySelectorAll<HTMLElement>("button, [tabindex='0'], video[controls]"));
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, toggle, toggleFs]);

  // pointer drag on a horizontal track → ratio
  const drag = (ref: React.RefObject<HTMLDivElement | null>, apply: (ratio: number) => void) => (e: React.PointerEvent) => {
    const track = ref.current;
    if (!track) return;
    const at = (x: number) => {
      const r = track.getBoundingClientRect();
      apply((x - r.left) / r.width);
    };
    at(e.clientX);
    const move = (ev: PointerEvent) => at(ev.clientX);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  if (!mounted) return null;

  const videoEvents = {
    onPlay: () => {
      setPlaying(true);
      poke();
    },
    onPause: () => {
      setPlaying(false);
      setIdle(false);
    },
    onTimeUpdate: (e: React.SyntheticEvent<HTMLVideoElement>) => setTime(e.currentTarget.currentTime),
    onLoadedMetadata: (e: React.SyntheticEvent<HTMLVideoElement>) => setDur(e.currentTarget.duration),
    onDurationChange: (e: React.SyntheticEvent<HTMLVideoElement>) => isFinite(e.currentTarget.duration) && setDur(e.currentTarget.duration),
    onProgress: (e: React.SyntheticEvent<HTMLVideoElement>) => {
      const v = e.currentTarget;
      if (v.buffered.length && v.duration) setBuffered(v.buffered.end(v.buffered.length - 1) / v.duration);
    },
    onEnded: () => setPlaying(false),
  };

  if (!desktop) {
    return (
      <div ref={rootRef} className={styles.native} role="dialog" aria-modal="true" aria-label={title}>
        <video ref={videoRef} className={styles.nativeVideo} src={src} controls playsInline autoPlay {...videoEvents} />
        <button ref={closeRef} type="button" className={styles.nativeClose} onClick={onClose} aria-label="Close video">
          ×
        </button>
      </div>
    );
  }

  const progress = dur ? time / dur : 0;
  const cls = [styles.player, shown && styles.open, playing && styles.playing, idle && playing && styles.idle].filter(Boolean).join(" ");
  return (
    <div ref={rootRef} className={cls} role="dialog" aria-modal="true" aria-label={title} onPointerMove={poke}>
      <div className={styles.veil} onClick={onClose} aria-hidden="true" />
      <div className={styles.shell}>
        <div className={styles.panel}>
          <div className={styles.frame} data-frame>
            <video ref={videoRef} className={styles.video} src={src} playsInline preload="auto" onClick={toggle} {...videoEvents} />
            <div className={styles.chrome}>
              <button ref={closeRef} type="button" className={styles.close} onClick={onClose} aria-label="Close video">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
              <div className={styles.dock}>
                <button type="button" className={styles.btn} onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    {playing ? <path d="M7.5 6.5h3.25v11H7.5zm6 0h3.25v11h-3.25z" fill="currentColor" /> : <path d="M8 6.2v11.6L18.2 12 8 6.2z" fill="currentColor" />}
                  </svg>
                </button>
                <div
                  ref={scrubRef}
                  className={styles.scrub}
                  role="slider"
                  tabIndex={0}
                  aria-label="Seek"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progress * 100)}
                  aria-valuetext={`${fmt(time)} of ${fmt(dur)}`}
                  onPointerDown={drag(scrubRef, seekTo)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowRight") seekTo((time + 5) / dur);
                    if (e.key === "ArrowLeft") seekTo((time - 5) / dur);
                  }}
                >
                  <div className={styles.track}>
                    <div className={styles.buffer} style={{ transform: `scaleX(${buffered})` }} />
                    <div className={styles.played} style={{ transform: `scaleX(${progress})` }} />
                  </div>
                  <span className={styles.head} style={{ left: `${progress * 100}%` }} />
                </div>
                <span className={styles.time}>
                  {fmt(time)} <span className={styles.sep}>/</span> {fmt(dur)}
                </span>
                <button
                  type="button"
                  className={styles.btn}
                  onClick={() => {
                    const v = videoRef.current;
                    if (!v) return;
                    v.muted = !v.muted;
                    setMuted(v.muted);
                  }}
                  aria-label={muted ? "Unmute" : "Mute"}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4.75 9.5v5h4l4.75 3.8V5.7L8.75 9.5h-4z" fill="currentColor" />
                    {muted ? (
                      <path d="M15.2 9.8l5 5M20.2 9.8l-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    ) : (
                      <path d="M15.5 8.8a4.25 4.25 0 0 1 0 6.4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    )}
                  </svg>
                </button>
                <div
                  ref={volRef}
                  className={styles.vol}
                  role="slider"
                  tabIndex={0}
                  aria-label="Volume"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round((muted ? 0 : vol) * 100)}
                  onPointerDown={drag(volRef, setVolume)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowRight" || e.key === "ArrowUp") setVolume(vol + 0.1);
                    if (e.key === "ArrowLeft" || e.key === "ArrowDown") setVolume(vol - 0.1);
                  }}
                >
                  <div className={styles.track}>
                    <div className={styles.played} style={{ transform: `scaleX(${muted ? 0 : vol})` }} />
                  </div>
                </div>
                <button type="button" className={styles.btn} onClick={toggleFs} aria-label="Fullscreen">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5.5 9.5V5.5h4M14.5 5.5h4v4M18.5 14.5v4h-4M9.5 18.5h-4v-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
