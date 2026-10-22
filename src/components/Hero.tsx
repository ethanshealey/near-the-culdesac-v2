import type { CSSProperties } from 'react'
import Image from 'next/image'
import Logo from "@/components/brand/Logo";
import { getHero } from '@/lib/content';

const Hero = async () => {
  const { photoUrl, width, height } = await getHero()
  // The frame takes the photo's shape so nobody gets cropped out.
  // Photos uploaded before sizes were saved fall back to square.
  const ratio = width && height ? width / height : 1

  return (
    <div className='hero'>
        <div className='hero-left'>
            <p className='hero-left-text'>POP-ROCK / 90s ALT / 80s NEW WAVE</p>
            <Logo className='hero-logo' />
        </div>
        <div className='hero-right'>
            <figure className='hero-polaroid' style={{ '--ratio': ratio } as CSSProperties}>
                <div className='hero-polaroid-photo'>
                    {photoUrl && (
                        <Image
                            src={photoUrl}
                            alt='Near the Cul-de-sac Live @ Ponysaurus'
                            fill
                            sizes='(max-width: 900px) 85vw, 55vw'
                        />
                    )}
                </div>
                <figcaption className='hero-polaroid-caption'>live @ ponysaurus</figcaption>
            </figure>
        </div>
    </div>
  )
}

export default Hero
