import React from 'react'
import Wordmark from './brand/Wordmark'

const Header = () => {
  return (
    <header className="site-header">
        <Wordmark className="site-logo" />
        <nav>
          <ul className="site-nav">
            <li><a href="https://www.instagram.com/neartheculdesac/" target="_blank">Follow us!</a></li>
            <li><a href="https://ig.me/m/neartheculdesac" target="_blank">Book us!</a></li>
          </ul>
        </nav>
      </header>
  )
}

export default Header