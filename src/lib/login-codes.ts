// One-time login codes, stored in Firestore via the Admin SDK.
//
// Only a hash of each code is stored, so reading the database doesn't reveal
// live codes. Each email has at most one active code at a time.
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { adminDb } from "@/lib/firebase-admin";

const CODE_TTL_MS = 10 * 60 * 1000; // a code is valid for 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // at most one email per minute per address
const MAX_ATTEMPTS = 5; // wrong guesses allowed before the code is burned

type LoginCodeDoc = {
  codeHash: string;
  expiresAt: number;
  sentAt: number;
  attempts: number;
};

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

// Keyed by a hash of the email so the doc id is always valid and opaque.
const codeDoc = (email: string) => adminDb().collection("loginCodes").doc(sha256(email));

export function isAllowedEmail(email: string) {
  const allowed = (process.env.ADMIN_ALLOWED_EMAILS ?? "")
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);
  return allowed.includes(email);
}

export type IssueResult = { ok: true; code: string } | { ok: false; reason: "cooldown" };

export async function issueCode(email: string): Promise<IssueResult> {
  const ref = codeDoc(email);
  const existing = (await ref.get()).data() as LoginCodeDoc | undefined;
  const now = Date.now();

  if (existing && now - existing.sentAt < RESEND_COOLDOWN_MS) {
    return { ok: false, reason: "cooldown" };
  }

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  await ref.set({
    codeHash: sha256(`${email}:${code}`),
    expiresAt: now + CODE_TTL_MS,
    sentAt: now,
    attempts: 0,
  } satisfies LoginCodeDoc);

  return { ok: true, code };
}

export type VerifyResult = "ok" | "invalid" | "expired" | "too-many-attempts";

export async function verifyCode(email: string, code: string): Promise<VerifyResult> {
  const ref = codeDoc(email);

  // A transaction so two simultaneous guesses can't both slip past the attempt limit.
  return adminDb().runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data() as LoginCodeDoc | undefined;
    if (!data) return "invalid";

    if (Date.now() > data.expiresAt) {
      tx.delete(ref);
      return "expired";
    }
    if (data.attempts >= MAX_ATTEMPTS) {
      tx.delete(ref);
      return "too-many-attempts";
    }

    const expected = Buffer.from(data.codeHash, "hex");
    const actual = Buffer.from(sha256(`${email}:${code}`), "hex");
    if (!timingSafeEqual(expected, actual)) {
      tx.update(ref, { attempts: data.attempts + 1 });
      return "invalid";
    }

    // Single use: a correct code is consumed immediately.
    tx.delete(ref);
    return "ok";
  });
}
