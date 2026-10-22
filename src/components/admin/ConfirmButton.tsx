"use client";

import { useState } from "react";
import styles from "./admin.module.scss";

export default function ConfirmButton({
  label,
  onConfirm,
  disabled,
}: {
  label: string;
  onConfirm: () => void;
  disabled?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        className={styles.danger}
        disabled={disabled}
        onClick={() => setConfirming(true)}
      >
        {label}
      </button>
    );
  }

  return (
    <span className={styles.confirm}>
      Sure?
      <button
        type="button"
        className={styles.danger}
        onClick={() => {
          setConfirming(false);
          onConfirm();
        }}
      >
        Yes
      </button>
      <button type="button" className={styles.secondary} onClick={() => setConfirming(false)}>
        No
      </button>
    </span>
  );
}
