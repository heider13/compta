import Link from 'next/link';
import { Shield } from '@/components/icons';

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Link href="/" className="logo" style={{ color: 'white' }}>
              <span className="logo-mark">C</span>
              <span style={{ fontSize: 24 }}>compta</span>
            </Link>
            <p style={{ color: 'var(--ink-400)', marginTop: 16, fontSize: 14, maxWidth: 280 }}>
              La plateforme tout-en-un de formalités juridiques pour cabinets professionnels. Connectée au Guichet Unique INPI.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <span className="pill" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--ink-200)' }}>
                <Shield size={12} /> ISO 27001
              </span>
              <span className="pill" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--ink-200)' }}>
                RGPD
              </span>
            </div>
          </div>
          <div>
            <h4>Produit</h4>
            <a href="#fonctionnalites">Fonctionnalités</a>
            <a href="#formalites">Formalités couvertes</a>
            <a href="#tarifs">Tarifs</a>
            <a href="/app.html">Démo</a>
          </div>
          <div>
            <h4>Ressources</h4>
            <a href="#">Documentation API</a>
            <a href="#">Guide d&apos;onboarding</a>
            <a href="#">Centre d&apos;aide</a>
            <a href="#">Blog</a>
          </div>
          <div>
            <h4>Société</h4>
            <a href="#">À propos</a>
            <a href="#">Sécurité</a>
            <a href="#">Contact</a>
            <a href="#">Recrutement</a>
          </div>
          <div>
            <h4>Légal</h4>
            <a href="#">CGU</a>
            <a href="#">Politique de confidentialité</a>
            <a href="#">Mentions légales</a>
            <a href="#">DPA</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Compta SAS · 12 rue de la Paix, 75002 Paris</span>
          <span>RCS Paris 921 384 502 · Mandataire INPI agréé</span>
        </div>
      </div>
    </footer>
  );
}
