"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { signInWithCustomToken, signOut } from "firebase/auth";
import Wordmark from "@/components/brand/Wordmark";
import { auth } from "@/lib/firebase";
import { useAdminUser } from "@/lib/use-admin-user";
import styles from "./admin.module.scss";

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
  return data as T;
}

/** Shows the sign-in flow until an admin is signed in, then renders children. */
export default function AdminGate({ children }: { children: ReactNode }) {
  const adminUser = useAdminUser();

  if (!auth) {
    return (
      <Card>
        <p>Add your Firebase values to .env to enable admin sign-in.</p>
      </Card>
    );
  }

  if (adminUser.status === "loading") {
    return (
      <Card>
        <p className={styles.muted}>Loading…</p>
      </Card>
    );
  }

  if (adminUser.status === "signed-out") {
    return (
      <Card>
        <SignInForm />
      </Card>
    );
  }

  if (!adminUser.isAdmin) {
    return (
      <Card>
        <p className={styles.error}>
          <strong>{adminUser.user.email}</strong> doesn&apos;t have admin access.
        </p>
        <button className={styles.secondary} onClick={() => signOut(auth!)}>
          Sign out
        </button>
      </Card>
    );
  }

  return (
    <div className={styles.dashboard}>
      <header className={styles.topbar}>
        <Wordmark className={styles.logo} />
        <h1>Edit the site</h1>
        <span className={styles.muted}>{adminUser.user.email}</span>
        <a className={styles.secondary} href="/" target="_blank">
          View site
        </a>
        <button className={styles.secondary} onClick={() => signOut(auth!)}>
          Sign out
        </button>
      </header>
      {children}
    </div>
  );
}

function SignInForm() {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const requestCode = (event: FormEvent) => {
    event.preventDefault();
    run(async () => {
      await postJson("/api/auth/request-code", { email });
      setCode("");
      setStep("code");
    });
  };

  const verifyCode = (event: FormEvent) => {
    event.preventDefault();
    run(async () => {
      const { token } = await postJson<{ token: string }>("/api/auth/verify-code", { email, code });
      // useAdminUser picks up the new user via onIdTokenChanged.
      await signInWithCustomToken(auth!, token);
    });
  };

  if (step === "email") {
    return (
      <form onSubmit={requestCode} className={styles.form}>
        <label htmlFor="email">Email address</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@example.com"
          required
          autoFocus
        />
        <button className={styles.primary} disabled={busy}>
          {busy ? "Sending…" : "Email me a code"}
        </button>
        {error && <p className={styles.error}>{error}</p>}
      </form>
    );
  }

  return (
    <form onSubmit={verifyCode} className={styles.form}>
      <p className={styles.muted}>
        If <strong>{email}</strong> has admin access, a 6-digit code is on its way.
      </p>
      <label htmlFor="code">Login code</label>
      <input
        id="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6}"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        placeholder="123456"
        className={styles.code}
        required
        autoFocus
      />
      <button className={styles.primary} disabled={busy || code.length !== 6}>
        {busy ? "Verifying…" : "Sign in"}
      </button>
      {error && <p className={styles.error}>{error}</p>}
      <button
        type="button"
        className={styles.link}
        onClick={() => {
          setStep("email");
          setError(null);
        }}
      >
        Use a different email
      </button>
    </form>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <Wordmark className={styles.logo} />
        <h1>Admin access</h1>
        {children}
      </div>
    </main>
  );
}
