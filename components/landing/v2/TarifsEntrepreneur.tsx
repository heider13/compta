// Tarifs par formalité — uniquement sur la page Indépendants et TPE.
// Source unique : la grille du serveur (server/lib/tarifs.js via /api/public/tarifs),
// celle-là même que l'assistant facture. Rendu serveur, revalidé toutes les 5 min.

import { Check } from 'lucide-react';
import { VPS, type Offre } from '@/lib/espace/chat';
import { Container } from '../ui';

const ORDRE = ['creation_micro', 'creation_societe', 'creation_sci', 'modification', 'mise_en_sommeil', 'depot_comptes', 'fermeture_micro', 'dissolution'];

async function chargerTarifs(): Promise<Offre[]> {
  try {
    const r = await fetch(`${VPS}/api/public/tarifs`, { next: { revalidate: 300 } });
    if (!r.ok) return [];
    const d = (await r.json()) as { tarifs?: Offre[] };
    return (d.tarifs ?? []).sort((a, b) => ORDRE.indexOf(a.code) - ORDRE.indexOf(b.code));
  } catch {
    return [];
  }
}

const euros = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });

export async function TarifsEntrepreneur() {
  const tarifs = await chargerTarifs();
  if (!tarifs.length) return null;

  return (
    <section id="tarifs" className="relative overflow-hidden bg-white py-20 sm:py-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 640px 380px at 85% 0%, rgba(255,136,123,0.12), transparent 62%), radial-gradient(ellipse 520px 360px at 5% 100%, rgba(54,31,171,0.07), transparent 60%)' }}
      />
      <Container className="relative">
        <p className="font-mono text-[12px] uppercase tracking-[0.14em] !text-[var(--ink-500)]">Tarifs</p>
        <h2 className="mt-3 max-w-3xl font-[Sora] !text-[clamp(1.8rem,3.6vw,2.7rem)] !font-semibold !leading-[1.12] !text-[var(--violet-900)]">
          Un prix clair <span className="bg-gradient-to-r from-[#ff887b] to-[#ea42fd] bg-clip-text text-transparent">pour chaque formalité</span>
        </h2>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed">
          Prix de la prestation Legaly, payés une seule fois. Les frais officiels (greffe, INPI, annonce légale) s&apos;ajoutent et sont réglés directement sur le Guichet unique.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tarifs.map((t) => (
            <article
              key={t.code}
              className="flex flex-col rounded-2xl border border-[var(--violet-100)] bg-white p-5 shadow-[0_10px_30px_-18px_rgba(54,31,171,0.25)]"
            >
              <h3 className="font-[Sora] !text-[15px] !font-semibold !leading-snug !tracking-tight !text-[var(--violet-900)]">{t.libelle}</h3>
              <p className="mt-3 flex items-baseline gap-1.5">
                {t.provisoire ? (
                  <span className="font-[Sora] text-2xl font-bold text-[var(--violet-900)]">Sur devis</span>
                ) : (
                  <>
                    <span className="font-[Sora] text-3xl font-bold tracking-tight text-[var(--violet-900)]">{euros(t.prix_ht)} €</span>
                    <span className="text-[13px] !text-[var(--ink-500)]">HT</span>
                  </>
                )}
              </p>
              {!t.provisoire && (
                <p className="text-[12px] !text-[var(--ink-500)]">soit {euros(t.prix_ttc_cents / 100)} € TTC</p>
              )}
              <ul className="mt-4 flex-1 space-y-2">
                {t.inclus.map((i) => (
                  <li key={i} className="flex gap-2 text-[13px] leading-snug !text-[var(--ink-600)]">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-[#ff887b]" aria-hidden="true" />
                    {i}
                  </li>
                ))}
              </ul>
              <p className="mt-4 border-t border-[var(--violet-100)] pt-3 text-[11.5px] leading-snug !text-[var(--ink-500)]">
                <span className="font-medium !text-[var(--ink-600)]">Frais officiels :</span> {t.frais_officiels}
              </p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
