export type HeroContent = {
  photoUrl: string | null;
  photoPath: string | null;
  width: number | null;
  height: number | null;
};

export type Member = {
  id: string;
  name: string;
  role: string;
  bio: string;
  photoUrl: string | null;
  photoPath: string | null;
  order: number;
};

export type Gig = {
  id: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  link: string;
  notes: string;
};

export type MemberInput = Pick<Member, "name" | "role" | "bio">;
export type GigInput = Omit<Gig, "id">;
