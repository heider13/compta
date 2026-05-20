import Link from 'next/link';
import { Arrow } from '@/components/icons';

export function Nav() {
  return (
    <nav className="nav">
      <div className="container nav-inner">
        <Link href="/" className="logo" aria-label="Compta">
          <span className="logo-mark">C</span>
          <span style={{ fontSize: 19 }}>compta</span>
        </Link>
        <div className="nav-links">
          <a href="#formalites" className="nav-link">Formalités</a>
          <a href="#tarifs" className="nav-link">Tarifs</a>
          <a href="#fonctionnalites" className="nav-link">Fonctionnalités</a>
          <a href="/app.html" className="nav-link">Démo</a>
        </div>
        <div className="nav-cta">
          <a href="/auth/login" className="btn btn-ghost btn-sm">Se connecter</a>
          <a href="/auth/signup" className="btn btn-primary btn-sm">
            Demander une démo
            <Arrow size={16} />
          </a>
        </div>
      </div>
    </nav>
  );
}
