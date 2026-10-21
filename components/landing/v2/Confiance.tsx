// Bloc conformité (texte + illustration à badges) et bande des registres
// officiels connectés. Uniquement des faits vérifiables sur le produit.

import { Check, FileSignature, KeyRound, Landmark, Lock, ShieldCheck, UserCheck } from 'lucide-react';
import { Container } from '../ui';
import { Degrade, Halos, teinte } from './Couleurs';

export function Conformite() {
  return (
    <section id="securite" className="relative scroll-mt-24 overflow-hidden bg-gradient-to-b from-[#f7f3ff] via-white to-[#fff0ec] py-20 sm:py-24">
      <Halos />
      <Container className="relative grid items-center gap-12 lg:grid-cols-2">
        <div>
          <h2 className="font-[Sora] !text-[clamp(1.75rem,3.4vw,2.6rem)] !font-semibold !leading-[1.1] !text-[var(--violet-900)]">
            Conçu en France. Connecté aux registres officiels. <Degrade>Sous votre contrôle.</Degrade>
          </h2>
          <p className="!mt-5 max-w-lg !text-[var(--ink-600)]">
            Le juridique ne se délègue pas à l’aveugle. Legaly prépare, vous décidez : chaque dépôt, chaque signature et chaque paiement restent une action humaine.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              'Connexion officielle au Guichet unique INPI et au Registre national des entreprises',
              'Aucun dépôt sans votre validation : l’agent crée des brouillons, jamais de formalité déposée',
              'Identifiants INPI du cabinet chiffrés, accès cloisonné par cabinet',
              'Conforme RGPD : vos données et celles de vos clients ne servent qu’à vos dossiers',
            ].map((t) => (
              <li key={t} className="flex items-start gap-2.5 text-[15px] text-[var(--ink-700)]">
                <Check className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" /> {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-[460px]">
          <div className="rounded-3xl border border-[var(--violet-900)]/80 bg-gradient-to-br from-[#e9e1ff] via-[#fdeefb] to-[#ffe6dc] p-8 shadow-[5px_5px_0_rgba(8,3,49,0.85)]">
            <div className="space-y-3">
              {[
                { icon: Landmark, t: 'Brouillon créé au Guichet unique', s: 'En attente de votre validation' },
                { icon: FileSignature, t: 'Statuts et PV à signer', s: 'Signature électronique, qualifiée si besoin' },
                { icon: UserCheck, t: 'Validation du formaliste', s: 'Vous seul déposez et payez' },
              ].map(({ icon: Icon, t, s }) => (
                <div key={t} className="flex items-center gap-3 rounded-xl border border-[var(--ink-150)] bg-white px-4 py-3">
                  <span className="grid size-9 place-items-center rounded-lg bg-[var(--violet-100)] text-[var(--violet-700)]"><Icon className="size-4" /></span>
                  <span>
                    <span className="block text-sm font-semibold text-[var(--violet-900)]">{t}</span>
                    <span className="block text-xs text-[var(--ink-500)]">{s}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute -right-4 -top-6 flex gap-2">
            {[
              { icon: ShieldCheck, t: 'RGPD' },
              { icon: KeyRound, t: 'Chiffré' },
            ].map(({ icon: Icon, t }) => (
              <span key={t} className="grid w-20 place-items-center gap-1 rounded-2xl border border-[var(--violet-900)]/80 bg-white px-2 py-2.5 text-center text-[11px] font-semibold text-[var(--violet-900)] shadow-[2px_2px_0_rgba(8,3,49,0.85)]">
                <Icon className="size-5 text-[var(--violet-600)]" /> {t}
              </span>
            ))}
          </div>
          <span className="absolute -bottom-5 -left-4 grid size-14 place-items-center rounded-2xl border border-[var(--violet-900)]/80 bg-[var(--accent)] !text-white shadow-[2px_2px_0_rgba(8,3,49,0.85)]">
            <Lock className="size-6" />
          </span>
        </div>
      </Container>
    </section>
  );
}

export function Registres() {
  const sources = [
    { nom: 'Guichet unique INPI', detail: 'Créations, modifications, cessations' },
    { nom: 'Registre national des entreprises', detail: 'Fiches et documents déposés' },
    { nom: 'INSEE — SIRENE', detail: 'Avis de situation' },
    { nom: 'Signature électronique', detail: 'Simple, avancée ou qualifiée eIDAS' },
    { nom: 'Paiement en ligne', detail: 'Abonnement et facturation' },
  ];
  return (
    <section className="bg-gradient-to-b from-[#fff0ec] to-white py-16 sm:py-20">
      <Container>
        <div className="rounded-3xl px-6 py-12 sm:px-10" style={{ background: 'linear-gradient(120deg, var(--confiance-1, #ffe3d3) 0%, var(--confiance-2, #ffd9ea) 45%, var(--confiance-3, #e7ddff) 100%)' }}>
          <h2 className="text-center font-[Sora] !text-[clamp(1.5rem,2.6vw,2rem)] !font-semibold !text-[var(--violet-900)]">
            Connecté aux <Degrade>sources officielles</Degrade>
          </h2>
          <div className="mt-8 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
            {sources.map((s, i) => (
              <div key={s.nom} className="rounded-2xl border border-[var(--violet-900)]/80 bg-white px-4 py-5 text-center shadow-[3px_3px_0_rgba(8,3,49,0.85)] transition-transform hover:-translate-y-1" style={{ borderTop: `6px solid ${teinte(i).fort}` }}>
                <p className="font-[Sora] text-sm font-semibold text-[var(--violet-900)]">{s.nom}</p>
                <p className="mt-1 text-xs text-[var(--ink-500)]">{s.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
