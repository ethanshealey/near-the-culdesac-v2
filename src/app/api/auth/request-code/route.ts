import { isAllowedEmail, issueCode, normalizeEmail } from "@/lib/login-codes";
import { sendLoginCodeEmail } from "@/lib/send-email";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  // Respond the same way whether or not the email is allowed, so this endpoint
  // can't be used to discover which addresses are admins.
  if (!isAllowedEmail(email)) {
    return Response.json({ ok: true });
  }

  const result = await issueCode(email);
  if (!result.ok) {
    return Response.json(
      { error: "A code was sent recently. Wait a minute before requesting another." },
      { status: 429 },
    );
  }

  try {
    await sendLoginCodeEmail(email, result.code);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Couldn't send the email. Try again later." }, { status: 502 });
  }

  return Response.json({ ok: true });
}
