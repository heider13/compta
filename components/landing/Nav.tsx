import Link from 'next/link';
import { Arrow } from '@/components/icons';
import { Container, btnCtaSm, btnGhostSm } from './ui';

const LINKS = [
  { href: '/experts-comptables', label: 'Experts-comptables' },
  { href: '/avocats', label: 'Avocats' },
  { href: '/directions-juridiques', label: 'Dir. juridiques' },
  { href: '/#demo', label: 'Démo' },
  { href: '/#tarifs', label: 'Tarifs' },
];

export function Nav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--ink-100)] bg-white/80 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link href="/" className="logo flex items-center gap-2 no-underline" aria-label="Compta">
          <span className="logo-mark">C</span>
          <span className="text-[19px] font-semibold tracking-tight text-[var(--violet-900)]">compta</span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-[var(--ink-600)] transition-colors duration-150 hover:text-[var(--violet-900)]"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          <a href="/auth/login" className={btnGhostSm}>
            Se connecter
          </a>
          <a href="/auth/signup" className={btnCtaSm}>
            <span className="hidden sm:inline">Demander une démo</span>
            <span className="sm:hidden">Démo</span>
            <Arrow size={15} />
          </a>
        </div>
      </Container>
    </nav>
  );
}
