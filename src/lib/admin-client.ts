"use client";

// Browser-side helpers for the admin editors.
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, storage } from "@/lib/firebase";
import type { ActionResult } from "@/app/admin/actions";

/** Calls a server action with the signed-in user's ID token, throwing on failure. */
export async function callAction<T>(
  action: (idToken: string) => Promise<ActionResult<T>>,
): Promise<T> {
  const user = auth?.currentUser;
  if (!user) throw new Error("You've been signed out. Sign in again.");

  const result = await action(await user.getIdToken());
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

/** Shrinks a photo to at most `maxSize` px on its longest side, as a JPEG, and reports its new size. */
async function resizeImage(file: File, maxSize = 1600) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Couldn't read that image."))),
      "image/jpeg",
      0.85,
    ),
  );
  return { blob, width: canvas.width, height: canvas.height };
}

/** Uploads a photo to Storage under `folder` and returns where it lives. */
export async function uploadPhoto(folder: "members" | "hero", file: File, maxSize?: number) {
  if (!storage) throw new Error("Firebase Storage isn't configured.");

  const { blob, width, height } = await resizeImage(file, maxSize);
  const path = `${folder}/${crypto.randomUUID()}.jpg`;
  const photoRef = ref(storage, path);
  await uploadBytes(photoRef, blob, {
    contentType: "image/jpeg",
    // Each upload gets a new path, so browsers can cache it forever.
    cacheControl: "public, max-age=31536000, immutable",
  });

  return { path, url: await getDownloadURL(photoRef), width, height };
}

export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong.";
