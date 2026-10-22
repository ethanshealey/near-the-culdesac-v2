import { adminAuth } from "@/lib/firebase-admin";
import { normalizeEmail, verifyCode } from "@/lib/login-codes";

const ERRORS = {
  invalid: "That code is incorrect.",
  expired: "That code has expired. Request a new one.",
  "too-many-attempts": "Too many wrong attempts. Request a new code.",
} as const;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";

  if (!email || !/^\d{6}$/.test(code)) {
    return Response.json({ error: "Enter the 6-digit code from your email." }, { status: 400 });
  }

  const result = await verifyCode(email, code);
  if (result !== "ok") {
    return Response.json({ error: ERRORS[result] }, { status: 401 });
  }

  const auth = adminAuth();
  const user = await auth
    .getUserByEmail(email)
    .catch(() => auth.createUser({ email, emailVerified: true }));

  if (!user.customClaims?.admin) {
    await auth.setCustomUserClaims(user.uid, { ...user.customClaims, admin: true });
  }

  const token = await auth.createCustomToken(user.uid);
  return Response.json({ token });
}
