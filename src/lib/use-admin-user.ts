"use client";

import { useEffect, useState } from "react";
import { onIdTokenChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";

export type AdminUserState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "signed-in"; user: User; isAdmin: boolean };

// Tracks the Firebase user and whether their token carries the admin claim.
export function useAdminUser(): AdminUserState {
  const [state, setState] = useState<AdminUserState>(
    auth ? { status: "loading" } : { status: "signed-out" },
  );

  useEffect(() => {
    if (!auth) return;

    return onIdTokenChanged(auth, async (user) => {
      if (!user) {
        setState({ status: "signed-out" });
        return;
      }
      const { claims } = await user.getIdTokenResult();
      setState({ status: "signed-in", user, isAdmin: claims.admin === true });
    });
  }, []);

  return state;
}
