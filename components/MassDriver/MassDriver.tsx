"use client";

import Image from "next/image";
import { useState } from "react";
import { LinkCta } from "@/components/ui/LinkCta";
import { VideoPlayer } from "./VideoPlayer";
import styles from "./MassDriver.module.css";

export function MassDriver() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <section className={styles.mass} id="mass">
        <div className={styles.media} aria-hidden="true">
          <Image className={styles.bg} src="/media/mass.webp" alt="" fill sizes="100vw" />
          <div className={styles.scrimTop} />
          <div className={styles.scrimLeft} />
          <div className={styles.scrimBottom} />
        </div>
        <div className={`container ${styles.content}`}>
          <h2 className="h2 reveal">The next step: lunar mass drivers</h2>
          <div className={`${styles.actions} reveal`}>
            <LinkCta onClick={() => setOpen(true)} label="Watch Now" short="Watch" />
          </div>
        </div>
        <div className={styles.outro} aria-hidden="true" />
      </section>
      <div className={styles.blend} aria-hidden="true" />
      <VideoPlayer src="/media/mass-film.webm" title="Lunar mass driver film" open={open} onClose={() => setOpen(false)} />
    </>
  );
}
