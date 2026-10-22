import { Suspense } from 'react'
import { getGigsByStatus } from '@/lib/content'
import type { Gig } from '@/lib/content-types'

// Gig dates are plain "YYYY-MM-DD" strings. Read and format them in UTC so
// the server's own time zone can't shift a gig onto the day before.
const formatDate = (date: string, options: Intl.DateTimeFormatOptions) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { ...options, timeZone: 'UTC' })

const Gigs = () => {
  return (
    <section id="gigs" aria-labelledby="gigs-title">
        <h2 id="gigs-title" className="gigs-title">Catch Us Live</h2>
        {/* Which gigs are upcoming depends on today's date, so the list renders
            per request; the heading above is still part of the static page. */}
        <Suspense fallback={<p className='gigs-empty'>Loading shows…</p>}>
            <GigList />
        </Suspense>
    </section>
  )
}

const GigList = async () => {
  const { upcoming, past } = await getGigsByStatus()

  return (
    <>
        {upcoming.length > 0 ? (
            <ul className='gig-list'>
                {upcoming.map((gig) => <GigRow key={gig.id} gig={gig} />)}
            </ul>
        ) : (
            <p className='gigs-empty'>
                No shows booked right now. <a href='https://ig.me/m/neartheculdesac' target='_blank' rel='noopener noreferrer'>Book us!</a>
            </p>
        )}

        {past.length > 0 && (
            <details className='gigs-past'>
                <summary>Past shows ({past.length})</summary>
                <ul className='gig-list'>
                    {past.map((gig) => <GigRow key={gig.id} gig={gig} isPast />)}
                </ul>
            </details>
        )}
    </>
  )
}

const GigRow = ({ gig, isPast = false }: { gig: Gig; isPast?: boolean }) => {
  const details = [gig.city, gig.time].filter(Boolean).join(' · ')

  return (
    <li className={isPast ? 'gig gig-past' : 'gig'}>
        <time className='gig-date' dateTime={gig.date}>
            <span className='gig-month'>{formatDate(gig.date, { month: 'short' })}</span>
            <span className='gig-day'>{formatDate(gig.date, { day: 'numeric' })}</span>
            <span className='gig-weekday'>{formatDate(gig.date, { weekday: 'short' })}</span>
        </time>

        <div className='gig-info'>
            <h3 className='gig-venue'>{gig.venue}</h3>
            {details && <p className='gig-details'>{details}</p>}
            {gig.notes && <p className='gig-notes'>{gig.notes}</p>}
        </div>

        {gig.link && !isPast && (
            <a className='gig-link' href={gig.link} target='_blank' rel='noopener noreferrer'>
                Info<span className='visually-hidden'> about {gig.venue}</span> →
            </a>
        )}
    </li>
  )
}

export default Gigs
