"use client";

import { useState, type FormEvent } from "react";
import { deleteMember, moveMember, saveMember, setMemberPhoto } from "@/app/admin/actions";
import { callAction, errorMessage, uploadPhoto } from "@/lib/admin-client";
import type { Member } from "@/lib/content-types";
import ConfirmButton from "./ConfirmButton";
import styles from "./admin.module.scss";

export default function MembersEditor({ members }: { members: Member[] }) {
  const [adding, setAdding] = useState(false);

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2>Band members</h2>
        {!adding && (
          <button className={styles.primary} onClick={() => setAdding(true)}>
            Add member
          </button>
        )}
      </div>

      {adding && <MemberForm member={null} onDone={() => setAdding(false)} />}
      {members.length === 0 && !adding && <p className={styles.muted}>No members yet.</p>}

      {members.map((member, index) => (
        <MemberForm
          key={member.id}
          member={member}
          isFirst={index === 0}
          isLast={index === members.length - 1}
        />
      ))}
    </section>
  );
}

type MemberFormProps = {
  member: Member | null;
  isFirst?: boolean;
  isLast?: boolean;
  onDone?: () => void;
};

function MemberForm({ member, isFirst, isLast, onDone }: MemberFormProps) {
  const [name, setName] = useState(member?.name ?? "");
  const [role, setRole] = useState(member?.role ?? "");
  const [bio, setBio] = useState(member?.bio ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const dirty =
    !member || name !== member.name || role !== member.role || bio !== member.bio;

  const run = async (label: string, task: () => Promise<string | void>) => {
    setBusy(label);
    setMessage(null);
    try {
      const done = await task();
      if (done) setMessage({ text: done });
    } catch (error) {
      setMessage({ text: errorMessage(error), error: true });
    } finally {
      setBusy(null);
    }
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    run("Saving…", async () => {
      await callAction((token) => saveMember(token, member?.id ?? null, { name, role, bio }));
      if (!member) {
        onDone?.();
        return;
      }
      return "Saved.";
    });
  };

  const changePhoto = (file: File | undefined) => {
    if (!file || !member) return;
    run("Uploading…", async () => {
      const photo = await uploadPhoto("members", file);
      await callAction((token) => setMemberPhoto(token, member.id, photo));
      return "Photo updated.";
    });
  };

  return (
    <form className={styles.item} onSubmit={save}>
      <div className={styles.photo}>
        {member?.photoUrl ? (
          <img src={member.photoUrl} alt={`Photo of ${member.name}`} />
        ) : (
          <div className={styles.photoPlaceholder}>No photo</div>
        )}
        {member ? (
          <>
            <label className={styles.secondary}>
              {member.photoUrl ? "Replace photo" : "Add photo"}
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
            {member.photoUrl && (
              <ConfirmButton
                label="Remove photo"
                disabled={!!busy}
                onConfirm={() =>
                  run("Removing…", async () => {
                    await callAction((token) => setMemberPhoto(token, member.id, null));
                    return "Photo removed.";
                  })
                }
              />
            )}
          </>
        ) : (
          <p className={styles.muted}>Save first, then add a photo.</p>
        )}
      </div>

      <div className={styles.fields}>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} />
        </label>
        <label>
          Role
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Bass, backing vocals"
            maxLength={80}
          />
        </label>
        <label>
          Bio
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={6}
            maxLength={3000}
            placeholder="Leave a blank line between paragraphs."
          />
        </label>

        <div className={styles.actions}>
          <button className={styles.primary} disabled={!!busy || !dirty}>
            {busy === "Saving…" ? busy : member ? "Save changes" : "Add member"}
          </button>
          {member ? (
            <>
              <button
                type="button"
                className={styles.secondary}
                disabled={!!busy || isFirst}
                onClick={() => run("Moving…", () => callAction((t) => moveMember(t, member.id, -1)))}
                aria-label="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                className={styles.secondary}
                disabled={!!busy || isLast}
                onClick={() => run("Moving…", () => callAction((t) => moveMember(t, member.id, 1)))}
                aria-label="Move down"
              >
                ↓
              </button>
              <ConfirmButton
                label={`Delete ${member.name}`}
                disabled={!!busy}
                onConfirm={() => run("Deleting…", () => callAction((t) => deleteMember(t, member.id)))}
              />
            </>
          ) : (
            <button type="button" className={styles.secondary} onClick={onDone}>
              Cancel
            </button>
          )}
          {busy && busy !== "Saving…" && <span className={styles.muted}>{busy}</span>}
          {message && (
            <span className={message.error ? styles.error : styles.success}>{message.text}</span>
          )}
        </div>
      </div>
    </form>
  );
}
