"use server";

// Every content edit goes through these actions. Each one verifies the caller's
// Firebase ID token carries the admin claim, validates the input, writes with
// the Admin SDK, and refreshes the cached content so the change is live.
import { updateTag } from "next/cache";
import { adminAuth, adminBucket, adminDb } from "@/lib/firebase-admin";
import type { GigInput, MemberInput } from "@/lib/content-types";

export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

// Errors whose message is safe to show the user.
class UserError extends Error {}

async function asAdmin<T>(idToken: string, fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const decoded = await adminAuth()
      .verifyIdToken(idToken)
      .catch(() => null);
    if (decoded?.admin !== true) {
      throw new UserError("You're not signed in as an admin. Try signing in again.");
    }
    return { ok: true, data: await fn() };
  } catch (error) {
    if (error instanceof UserError) return { ok: false, error: error.message };
    console.error(error);
    return { ok: false, error: "Something went wrong saving that. Try again." };
  }
}

function text(value: unknown, label: string, max: number, required = false) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (required && !trimmed) throw new UserError(`${label} is required.`);
  if (trimmed.length > max) throw new UserError(`${label} must be ${max} characters or fewer.`);
  return trimmed;
}

async function deletePhoto(path: string | null | undefined) {
  if (path) await adminBucket().file(path).delete({ ignoreNotFound: true });
}

const members = () => adminDb().collection("members");
const gigs = () => adminDb().collection("gigs");

// --- Members ---------------------------------------------------------------

export async function saveMember(idToken: string, id: string | null, input: MemberInput) {
  return asAdmin(idToken, async () => {
    const data = {
      name: text(input.name, "Name", 80, true),
      role: text(input.role, "Role", 80),
      bio: text(input.bio, "Bio", 3000),
    };

    let savedId = id;
    if (savedId) {
      await members().doc(savedId).update(data);
    } else {
      // New members go to the end of the list.
      const last = await members().orderBy("order", "desc").limit(1).get();
      const order = last.empty ? 0 : (last.docs[0].data().order ?? 0) + 1;
      savedId = (await members().add({ ...data, order, photoUrl: null, photoPath: null })).id;
    }

    updateTag("members");
    return savedId;
  });
}

type UploadedPhoto = { path: string; url: string; width: number; height: number };

const PHOTO_URL_PREFIX = "https://firebasestorage.googleapis.com/";

// Uploads come from the browser, so make sure they point at our own bucket
// and at a file the upload helper could have created in the right folder.
function checkPhoto(photo: UploadedPhoto | null, folder: "members" | "hero") {
  const path = new RegExp(`^${folder}/[0-9a-f-]{36}\\.jpg$`);
  const validSize = (n: number) => Number.isInteger(n) && n > 0 && n <= 10_000;
  if (
    photo &&
    (!path.test(photo.path) ||
      !photo.url.startsWith(PHOTO_URL_PREFIX) ||
      !validSize(photo.width) ||
      !validSize(photo.height))
  ) {
    throw new UserError("That photo upload looks invalid. Try again.");
  }
}

/** Point a member at a newly uploaded photo (or null to remove it). */
export async function setMemberPhoto(idToken: string, id: string, photo: UploadedPhoto | null) {
  return asAdmin(idToken, async () => {
    checkPhoto(photo, "members");

    const ref = members().doc(id);
    const previous = (await ref.get()).data()?.photoPath;
    await ref.update({ photoPath: photo?.path ?? null, photoUrl: photo?.url ?? null });
    if (previous !== photo?.path) await deletePhoto(previous);

    updateTag("members");
  });
}

export async function moveMember(idToken: string, id: string, direction: -1 | 1) {
  return asAdmin(idToken, async () => {
    const docs = (await members().orderBy("order").get()).docs;
    const index = docs.findIndex((doc) => doc.id === id);
    const neighbor = docs[index + direction];
    if (index === -1 || !neighbor) return;

    // Renumber everyone so orders stay unique even if they had drifted.
    const reordered = docs.map((doc) => doc.id);
    [reordered[index], reordered[index + direction]] = [neighbor.id, id];

    const batch = adminDb().batch();
    reordered.forEach((memberId, order) => batch.update(members().doc(memberId), { order }));
    await batch.commit();

    updateTag("members");
  });
}

export async function deleteMember(idToken: string, id: string) {
  return asAdmin(idToken, async () => {
    const ref = members().doc(id);
    const photoPath = (await ref.get()).data()?.photoPath;
    await ref.delete();
    await deletePhoto(photoPath);

    updateTag("members");
  });
}

// --- Hero ------------------------------------------------------------------

/** Set the home page's hero photo (or null to remove it). */
export async function setHeroPhoto(idToken: string, photo: UploadedPhoto | null) {
  return asAdmin(idToken, async () => {
    checkPhoto(photo, "hero");

    const ref = adminDb().collection("settings").doc("hero");
    const previous = (await ref.get()).data()?.photoPath;
    // set + merge, since the doc doesn't exist until the first upload.
    await ref.set(
      {
        photoPath: photo?.path ?? null,
        photoUrl: photo?.url ?? null,
        // Lets the home page size the frame to the photo without cropping it.
        width: photo?.width ?? null,
        height: photo?.height ?? null,
      },
      { merge: true },
    );
    if (previous !== photo?.path) await deletePhoto(previous);

    updateTag("hero");
  });
}

// --- Gigs ------------------------------------------------------------------

export async function saveGig(idToken: string, id: string | null, input: GigInput) {
  return asAdmin(idToken, async () => {
    const date = text(input.date, "Date", 10, true);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new UserError("Date must look like 2026-10-31.");

    const link = text(input.link, "Link", 500);
    if (link && !/^https?:\/\//.test(link)) {
      throw new UserError("Link must start with http:// or https://.");
    }

    const data = {
      date,
      time: text(input.time, "Time", 60),
      venue: text(input.venue, "Venue", 120, true),
      city: text(input.city, "City", 80),
      link,
      notes: text(input.notes, "Notes", 500),
    };

    let savedId = id;
    if (savedId) {
      await gigs().doc(savedId).update(data);
    } else {
      savedId = (await gigs().add(data)).id;
    }

    updateTag("gigs");
    return savedId;
  });
}

export async function deleteGig(idToken: string, id: string) {
  return asAdmin(idToken, async () => {
    await gigs().doc(id).delete();
    updateTag("gigs");
  });
}
