"use client";

import { useState, type FormEvent } from "react";
import { deleteGig, saveGig } from "@/app/admin/actions";
import { callAction, errorMessage } from "@/lib/admin-client";
import type { Gig, GigInput } from "@/lib/content-types";
import ConfirmButton from "./ConfirmButton";
import styles from "./admin.module.scss";

const EMPTY_GIG: GigInput = { date: "", time: "", venue: "", city: "", link: "", notes: "" };

// The browser's local date, which is close enough for labeling in the editor.
const localToday = () => new Date().toLocaleDateString("en-CA");

export default function GigsEditor({ gigs }: { gigs: Gig[] }) {
  const [adding, setAdding] = useState(false);
  const today = localToday();

  // Newest first, so upcoming gigs sit at the top where they get edited most.
  const sorted = [...gigs].reverse();

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2>Gigs</h2>
        {!adding && (
          <button className={styles.primary} onClick={() => setAdding(true)}>
            Add gig
          </button>
        )}
      </div>

      {adding && <GigForm gig={null} onDone={() => setAdding(false)} />}
      {gigs.length === 0 && !adding && <p className={styles.muted}>No gigs yet.</p>}

      {sorted.map((gig) => (
        <GigForm key={gig.id} gig={gig} isPast={gig.date < today} />
      ))}
    </section>
  );
}

type GigFormProps = {
  gig: Gig | null; // null = a new, unsaved gig
  isPast?: boolean;
  onDone?: () => void;
};

function GigForm({ gig, isPast, onDone }: GigFormProps) {
  const [values, setValues] = useState<GigInput>(gig ?? EMPTY_GIG);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const field = (name: keyof GigInput) => ({
    value: values[name],
    onChange: (e: { target: { value: string } }) =>
      setValues((v) => ({ ...v, [name]: e.target.value })),
  });

  const dirty = !gig || (Object.keys(EMPTY_GIG) as (keyof GigInput)[]).some((k) => values[k] !== gig[k]);

  const run = async (task: () => Promise<string | void>) => {
    setBusy(true);
    setMessage(null);
    try {
      const done = await task();
      if (done) setMessage({ text: done });
    } catch (error) {
      setMessage({ text: errorMessage(error), error: true });
    } finally {
      setBusy(false);
    }
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    run(async () => {
      await callAction((token) => saveGig(token, gig?.id ?? null, values));
      if (!gig) {
        onDone?.();
        return;
      }
      return "Saved.";
    });
  };

  return (
    <form className={`${styles.item} ${isPast ? styles.past : ""}`} onSubmit={save}>
      <div className={styles.fields}>
        {isPast && <span className={styles.badge}>Past</span>}
        <div className={styles.row}>
          <label>
            Date
            <input type="date" required {...field("date")} />
          </label>
          <label>
            Time
            <input placeholder="Doors 7pm" maxLength={60} {...field("time")} />
          </label>
        </div>
        <div className={styles.row}>
          <label>
            Venue
            <input required maxLength={120} {...field("venue")} />
          </label>
          <label>
            City
            <input maxLength={80} {...field("city")} />
          </label>
        </div>
        <label>
          Link (event page, tickets, flyer)
          <input type="url" placeholder="https://…" maxLength={500} {...field("link")} />
        </label>
        <label>
          Notes
          <input placeholder="with The Somebodies, all ages" maxLength={500} {...field("notes")} />
        </label>

        <div className={styles.actions}>
          <button className={styles.primary} disabled={busy || !dirty}>
            {busy ? "Saving…" : gig ? "Save changes" : "Add gig"}
          </button>
          {gig ? (
            <ConfirmButton
              label="Delete gig"
              disabled={busy}
              onConfirm={() => run(() => callAction((t) => deleteGig(t, gig.id)))}
            />
          ) : (
            <button type="button" className={styles.secondary} onClick={onDone}>
              Cancel
            </button>
          )}
          {message && (
            <span className={message.error ? styles.error : styles.success}>{message.text}</span>
          )}
        </div>
      </div>
    </form>
  );
}
