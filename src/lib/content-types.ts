// Shapes of the site's editable content. Safe to import from client and server.

export type HeroContent = {
  photoUrl: string | null;
  photoPath: string | null; // location in Firebase Storage
  width: number | null; // pixel size of the uploaded photo
  height: number | null;
};

export type Member = {
  id: string;
  name: string;
  role: string; // e.g. "Drums, vocals"
  bio: string; // plain text; blank lines separate paragraphs
  photoUrl: string | null;
  photoPath: string | null; // location in Firebase Storage
  order: number; // display order, lowest first
};

export type Gig = {
  id: string;
  date: string; // "YYYY-MM-DD", in the band's local time zone
  time: string; // free text, e.g. "Doors 7pm" (may be empty)
  venue: string;
  city: string; // may be empty
  link: string; // event page or tickets URL (may be empty)
  notes: string; // e.g. "with The Somebodies" (may be empty)
};

export type MemberInput = Pick<Member, "name" | "role" | "bio">;
export type GigInput = Omit<Gig, "id">;
