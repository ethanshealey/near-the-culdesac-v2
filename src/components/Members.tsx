import MembersCarousel from '@/components/MembersCarousel'
import { getMembers } from '@/lib/content'

const Members = async () => {
  const members = await getMembers()
  if (members.length === 0) return null

  return (
    <section id="members" aria-labelledby="members-title">
        <h2 id="members-title" className="members-title">Meet the Members</h2>
        <MembersCarousel members={members} />
    </section>
  )
}

export default Members
