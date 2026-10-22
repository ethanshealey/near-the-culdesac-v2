export async function sendLoginCodeEmail(to: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.LOGIN_EMAIL_FROM;

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY is not set.");
    }
    console.log(`\n[dev] Login code for ${to}: ${code}\n`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to,
      subject: `Your login code: ${code}`,
      text: `Your Near the Culdesac login code is ${code}.\n\nIt expires in 10 minutes. If you didn't request it, you can ignore this email.`,
    }),
  });

  if (!res.ok) {
    throw new Error(`Email send failed (${res.status}): ${await res.text()}`);
  }
}
