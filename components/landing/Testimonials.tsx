// Section témoignages — cartes citation avec guillemet accent + avatar,
// layout inspiré des carrousels d'avis legaltech.
//
// TESTIMONIALS est vide au lancement : on n'invente PAS d'avis clients
// (pratique commerciale trompeuse). Tant que le tableau est vide, la section
// affiche le bloc "programme pilote" — un CTA de recrutement beta honnête.
// Dès les premiers retours réels : remplir le tableau ci-dessous, le
// carrousel remplace le bloc pilote automatiquement.

import { Arrow } from '@/components/icons';

type Testimonial = {
  quote: string;
  name: string;
  role: string; // ex : "Expert-comptable — Cabinet Durand"
};

const TESTIMONIALS: Testimonial[] = [
  // { quote: '…', name: '…', role: '…' },
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();
}

export function Testimonials() {
  return (
    <section className="section" style={{ background: 'var(--ink-50)' }}>
      <div className="container">
        <div className="sec-head">
          <span className="eyebrow"><span className="dot" />Ils utilisent Compta</span>
          <h2>Conçu avec les professionnels<br />qui déposent au quotidien.</h2>
        </div>

        {TESTIMONIALS.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="card" style={{ padding: 26, background: 'white' }}>
                <div style={{ fontSize: 40, lineHeight: 1, color: 'var(--accent)', fontFamily: 'Georgia, serif', marginBottom: 10 }} aria-hidden="true">
                  “
                </div>
                <p style={{ fontSize: 15, color: 'var(--ink-800, var(--ink-900))', lineHeight: 1.65, margin: '0 0 18px' }}>
                  {t.quote}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                      background: 'var(--violet-100, #E9E2FA)', color: 'var(--accent-ink)',
                      display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700,
                    }}
                  >
                    {initials(t.name)}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{t.name}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-500)' }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            className="card-elev"
            style={{
              maxWidth: 680, margin: '0 auto', padding: '36px 40px', textAlign: 'center',
              background: 'white', borderRadius: 20,
            }}
          >
            <span className="eyebrow" style={{ margin: '0 auto 14px' }}>
              <span className="dot" />Programme pilote
            </span>
            <h3 style={{ fontSize: 22, marginBottom: 10 }}>
              Les premiers cabinets testent Compta en avant-première.
            </h3>
            <p style={{ fontSize: 15, color: 'var(--ink-600)', margin: '0 auto 22px', maxWidth: 520 }}>
              Rejoignez le programme pilote : onboarding personnalisé, accès direct à
              l&apos;équipe produit, et vos retours façonnent la feuille de route.
              Places limitées.
            </p>
            <a href="/auth/signup" className="btn btn-accent btn-lg">
              Rejoindre le programme pilote
              <Arrow size={16} />
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
