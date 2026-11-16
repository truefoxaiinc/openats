'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, BriefcaseBusiness, Menu, X } from 'lucide-react';
import styles from '@/app/marketing.module.css';

const links = [
  { label: 'Features', href: '#features' },
  { label: 'Solutions', href: '#solutions' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Resources', href: '#resources' },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className={styles.navWrap}>
      <nav className={styles.nav} aria-label="Main navigation">
        <Link href="/" className={styles.wordmark} aria-label="OpenATS home" onClick={() => setOpen(false)}>
          <span className={styles.brandIcon}><BriefcaseBusiness size={18} strokeWidth={2.2} /></span>
          <span>open<span className={styles.brandAccent}>ats</span></span>
        </Link>

        <div className={styles.desktopLinks}>
          {links.map((link) => <a key={link.href} href={link.href}>{link.label}</a>)}
        </div>

        <div className={styles.navActions}>
          <Link href="/candidate/login" className={styles.loginLink}>Candidate sign in</Link>
          <Link href="/login" className={styles.loginLink}>Log in</Link>
          <Link href="/signup" className={styles.navCta}>Get started <ArrowUpRight size={15} /></Link>
        </div>

        <button
          type="button"
          className={styles.menuToggle}
          aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={21} /> : <Menu size={21} />}
        </button>
      </nav>

      {open && (
        <div className={styles.mobileMenu} id="mobile-navigation">
          {links.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.label}</a>
          ))}
          <div className={styles.mobileActions}>
            <Link href="/candidate/login" onClick={() => setOpen(false)}>Candidate sign in</Link>
            <Link href="/login" onClick={() => setOpen(false)}>Log in</Link>
            <Link href="/signup" className={styles.navCta} onClick={() => setOpen(false)}>Get started <ArrowUpRight size={15} /></Link>
          </div>
        </div>
      )}
    </header>
  );
}
