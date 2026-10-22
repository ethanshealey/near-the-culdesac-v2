"use client";

import { useState } from "react";
import { setHeroPhoto } from "@/app/admin/actions";
import { callAction, errorMessage, uploadPhoto } from "@/lib/admin-client";
import type { HeroContent } from "@/lib/content-types";
import ConfirmButton from "./ConfirmButton";
import styles from "./admin.module.scss";

export default function HeroEditor({ hero }: { hero: HeroContent }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const run = async (label: string, task: () => Promise<string>) => {
    setBusy(label);
    setMessage(null);
    try {
      setMessage({ text: await task() });
    } catch (error) {
      setMessage({ text: errorMessage(error), error: true });
    } finally {
      setBusy(null);
    }
  };

  const changePhoto = (file: File | undefined) => {
    if (!file) return;
    run("Uploading…", async () => {
      const photo = await uploadPhoto("hero", file, 2400);
      await callAction((token) => setHeroPhoto(token, photo));
      return "Photo updated.";
    });
  };

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2>Banner photo</h2>
      </div>

      <div className={styles.item}>
        {hero.photoUrl ? (
          <img className={styles.heroPreview} src={hero.photoUrl} alt="Current hero photo" />
        ) : (
          <div className={`${styles.heroPreview} ${styles.photoPlaceholder}`}>No photo</div>
        )}

        <div className={styles.actions}>
          <label className={styles.secondary}>
            {hero.photoUrl ? "Replace photo" : "Add photo"}
            <input
              type="file"
              accept="image/*"
              hidden
              disabled={!!busy}
              onChange={(e) => {
                changePhoto(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          {hero.photoUrl && (
            <ConfirmButton
              label="Remove photo"
              disabled={!!busy}
              onConfirm={() =>
                run("Removing…", async () => {
                  await callAction((token) => setHeroPhoto(token, null));
                  return "Photo removed.";
                })
              }
            />
          )}
          {busy && <span className={styles.muted}>{busy}</span>}
          {message && (
            <span className={message.error ? styles.error : styles.success}>{message.text}</span>
          )}
        </div>
      </div>
    </section>
  );
}
