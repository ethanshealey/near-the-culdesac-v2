import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import type { DocumentData } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import type { Gig, HeroContent, Member } from "@/lib/content-types";

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

export async function getMembers(): Promise<Member[]> {
  "use cache";
  cacheLife("max");
  cacheTag("members");

  const snapshot = await adminDb().collection("members").orderBy("order").get();
  return snapshot.docs.map((doc) => toMember(doc.id, doc.data()));
}

export async function getGigs(): Promise<Gig[]> {
  "use cache";
  cacheLife("max");
  cacheTag("gigs");

  const snapshot = await adminDb().collection("gigs").orderBy("date").get();
  return snapshot.docs.map((doc) => toGig(doc.id, doc.data()));
}

export async function getGigsByStatus(): Promise<{ upcoming: Gig[]; past: Gig[] }> {
  await connection();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: BAND_TIME_ZONE }).format(new Date());
  const gigs = await getGigs();

  return {
    upcoming: gigs.filter((gig) => gig.date >= today),
    past: gigs.filter((gig) => gig.date < today).reverse(),
  };
}

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
