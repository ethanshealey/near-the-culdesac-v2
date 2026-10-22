import AdminGate from "@/components/admin/AdminGate";
import GigsEditor from "@/components/admin/GigsEditor";
import HeroEditor from "@/components/admin/HeroEditor";
import MembersEditor from "@/components/admin/MembersEditor";
import { getGigs, getHero, getMembers } from "@/lib/content";

export default async function Admin() {
  const [hero, members, gigs] = await Promise.all([getHero(), getMembers(), getGigs()]);

  return (
    <AdminGate>
      <HeroEditor hero={hero} />
      <MembersEditor members={members} />
      <GigsEditor gigs={gigs} />
    </AdminGate>
  );
}
