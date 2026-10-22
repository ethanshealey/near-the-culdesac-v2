import { cacheLife } from 'next/cache'

const Footer = async () => {
  'use cache'
  cacheLife('days')

  return (
    <footer className="site-footer">
      <p>&copy; {new Date().getFullYear()} Near the Culdesac. All rights reserved.</p>
    </footer>
  )
}

export default Footer
