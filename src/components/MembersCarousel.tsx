'use client'

import { useEffect, useRef, useState, type MouseEvent } from 'react'
import Image from 'next/image'
import type { Member } from '@/lib/content-types'

// Bios are plain text with blank lines between paragraphs.
const paragraphs = (bio: string) => bio.split(/\n\s*\n/).filter((p) => p.trim())

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function MembersCarousel({ members }: { members: Member[] }) {
  const gridRef = useRef<HTMLUListElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [current, setCurrent] = useState(0) // the centered card on mobile
  const [selected, setSelected] = useState<Member | null>(null) // whose bio is open

  // Keep `current` in sync as people swipe. A card counts as current once
  // most of it is in view; on desktop the arrows are hidden, so it's unused.
  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return

    const cards = Array.from(grid.children)
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setCurrent(cards.indexOf(entry.target))
        }
      },
      { root: grid, threshold: 0.6 },
    )
    cards.forEach((card) => observer.observe(card))
    return () => observer.disconnect()
  }, [members])

  // showModal() (not show()) traps focus, handles Esc, and adds the backdrop.
  useEffect(() => {
    if (selected) dialogRef.current?.showModal()
  }, [selected])

  const goTo = (index: number) => {
    gridRef.current?.children[index]?.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'center',
    })
  }

  // closedby="any" closes on a backdrop click natively; Safari doesn't support
  // it yet, so do it by hand there. Clicks on the backdrop target the dialog
  // itself and land outside its box.
  const closeOnBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if ('closedBy' in HTMLDialogElement.prototype) return
    const dialog = event.currentTarget
    if (event.target !== dialog) return

    const rect = dialog.getBoundingClientRect()
    const inside =
      rect.top <= event.clientY && event.clientY <= rect.bottom &&
      rect.left <= event.clientX && event.clientX <= rect.right
    if (!inside) dialog.close()
  }

  return (
    <div className='carousel-wrapper'>
        <button
            type='button'
            className='carousel-btn carousel-btn-prev'
            aria-label='Previous member'
            disabled={current === 0}
            onClick={() => goTo(current - 1)}
        >
            <svg width='14' height='14' viewBox='0 0 14 14' fill='none' aria-hidden>
                <path d='M9 2L4 7L9 12' stroke='white' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
            </svg>
        </button>

        <ul className='band-grid' ref={gridRef}>
            {members.map((member) => (
                <li className='member' key={member.id}>
                    {member.photoUrl ? (
                        // Empty alt: the name is right below, so screen readers
                        // would otherwise hear it twice.
                        <Image
                            className='member-photo'
                            src={member.photoUrl}
                            alt=''
                            fill
                            sizes='(max-width: 900px) 82vw, 30vw'
                        />
                    ) : (
                        <div className='member-photo member-photo-empty' aria-hidden>
                            {member.name.charAt(0)}
                        </div>
                    )}

                    <div className='member-info'>
                        <h3 className='member-name'>{member.name}</h3>
                        {member.role && <p className='member-role'>{member.role}</p>}
                        {member.bio && <span className='member-more' aria-hidden>Read bio →</span>}
                    </div>

                    {/* Covers the whole card so anywhere on it opens the bio. */}
                    {member.bio && (
                        <button type='button' className='member-open' onClick={() => setSelected(member)}>
                            <span className='visually-hidden'>Read {member.name}&apos;s bio</span>
                        </button>
                    )}
                </li>
            ))}
        </ul>

        <button
            type='button'
            className='carousel-btn carousel-btn-next'
            aria-label='Next member'
            disabled={current === members.length - 1}
            onClick={() => goTo(current + 1)}
        >
            <svg width='14' height='14' viewBox='0 0 14 14' fill='none' aria-hidden>
                <path d='M5 2L10 7L5 12' stroke='white' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
            </svg>
        </button>

        <dialog
            ref={dialogRef}
            className='member-dialog'
            closedby='any'
            aria-labelledby='member-dialog-name'
            onClick={closeOnBackdropClick}
            onClose={() => setSelected(null)}
        >
            {selected && (
                <div className='member-dialog-body'>
                    {selected.photoUrl && (
                        <div className='member-dialog-photo'>
                            <Image src={selected.photoUrl} alt='' fill sizes='(max-width: 640px) 100vw, 260px' />
                        </div>
                    )}
                    <div className='member-dialog-text'>
                        <h3 id='member-dialog-name' className='member-name'>{selected.name}</h3>
                        {selected.role && <p className='member-role'>{selected.role}</p>}
                        {paragraphs(selected.bio).map((paragraph, i) => (
                            <p key={i} className='member-bio'>{paragraph}</p>
                        ))}
                    </div>
                    {/* A form with method="dialog" closes the dialog when submitted. */}
                    <form method='dialog'>
                        <button className='member-dialog-close' aria-label='Close'>✕</button>
                    </form>
                </div>
            )}
        </dialog>
    </div>
  )
}
