// Read the band's content for public pages. Server-only (uses the Admin SDK).
//
// Results are cached indefinitely and refreshed on demand: the admin actions
// call updateTag("members") / updateTag("gigs") after every edit.
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import type { DocumentData } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import type { Gig, HeroContent, Member } from "@/lib/content-types";

// Decides when a gig flips from "upcoming" to "past". Set this to the band's
// time zone, or a gig tonight could show as past on a server running in UTC.
const BAND_TIME_ZONE = "America/New_York";

const str = (value: unknown) => (typeof value === "string" ? value : "");

function toMember(id: string, data: DocumentData): Member {
  return {
    id,
    name: str(data.name),
    role: str(data.role),
    bio: str(data.bio),
    photoUrl: str(data.photoUrl) || null,
    photoPath: str(data.photoPath) || null,
    order: typeof data.order === "number" ? data.order : 0,
  };
}

function toGig(id: string, data: DocumentData): Gig {
  return {
    id,
    date: str(data.date),
    time: str(data.time),
    venue: str(data.venue),
    city: str(data.city),
    link: str(data.link),
    notes: str(data.notes),
  };
}

/** All band members, in display order. */
export async function getMembers(): Promise<Member[]> {
  "use cache";
  cacheLife("max");
  cacheTag("members");

  const snapshot = await adminDb().collection("members").orderBy("order").get();
  return snapshot.docs.map((doc) => toMember(doc.id, doc.data()));
}

/** All gigs, oldest first. */
export async function getGigs(): Promise<Gig[]> {
  "use cache";
  cacheLife("max");
  cacheTag("gigs");

  const snapshot = await adminDb().collection("gigs").orderBy("date").get();
  return snapshot.docs.map((doc) => toGig(doc.id, doc.data()));
}

/**
 * Gigs split around today: upcoming soonest-first, past most-recent-first.
 *
 * This depends on today's date, so it runs at request time. Render whatever
 * uses it inside a <Suspense> boundary.
 */
export async function getGigsByStatus(): Promise<{ upcoming: Gig[]; past: Gig[] }> {
  await connection();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: BAND_TIME_ZONE }).format(new Date());
  const gigs = await getGigs();

  return {
    upcoming: gigs.filter((gig) => gig.date >= today),
    past: gigs.filter((gig) => gig.date < today).reverse(),
  };
}

/** The hero photo on the home page. */
export async function getHero(): Promise<HeroContent> {
  "use cache";
  cacheLife("max");
  cacheTag("hero");

  const data = (await adminDb().collection("settings").doc("hero").get()).data() ?? {};
  const num = (value: unknown) => (typeof value === "number" ? value : null);
  return {
    photoUrl: str(data.photoUrl) || null,
    photoPath: str(data.photoPath) || null,
    width: num(data.width),
    height: num(data.height),
  };
}
