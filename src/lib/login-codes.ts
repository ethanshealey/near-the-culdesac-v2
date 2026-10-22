import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { adminDb } from "@/lib/firebase-admin";

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

type LoginCodeDoc = {
  codeHash: string;
  expiresAt: number;
  sentAt: number;
  attempts: number;
};

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

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

    tx.delete(ref);
    return "ok";
  });
}
