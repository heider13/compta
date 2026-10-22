// Page d'un module (/modules/[slug]) : même identité que les pages métier.
// En-tête (texte à gauche, écran du module à droite), fonctionnement en étapes dans
// un panneau marine, ce qui est inclus, autres modules, appel à l'action.

import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { MODULE_LIST, type LandingModule } from '@/lib/landing/modules';
import { Nav } from './Nav';
import { Container } from './ui';
import { MAQUETTES } from './v2/Maquettes';
import { CtaBand, FooterV2 } from './v2/Bas';

// Une paire de couleurs par module, dans la palette Legaly : pastel à gauche, soutenu à droite
const TEINTES = [
  { pastel: '#efeafe', profond: 'linear-gradient(150deg, #361fab 0%, #201367 100%)' },
  { pastel: '#fff1ee', profond: 'linear-gradient(150deg, #ff887b 0%, #c13ad6 100%)' },
  { pastel: '#fbeafb', profond: 'linear-gradient(150deg, #a43bc9 0%, #361fab 100%)' },
  { pastel: '#fff4e8', profond: 'linear-gradient(150deg, #ff9f7a 0%, #e2675c 100%)' },
  { pastel: '#eef0fe', profond: 'linear-gradient(150deg, #4a33d0 0%, #080331 100%)' },
];

export function ModulePage({ module: mod }: { module: LandingModule }) {
  const p = mod.page;
  const Maquette = MAQUETTES[p.maquette];
  const autres = MODULE_LIST.filter((x) => x.key !== mod.key);
  const Icone = mod.icon;
  const t = TEINTES[Math.max(0, MODULE_LIST.findIndex((x) => x.key === mod.key)) % TEINTES.length];

  return (
    <div className="landing-theme">
      <Nav surface="light" />

      {/* En-tête façon Pennylane : panneau pastel (texte) | panneau soutenu (écran du logiciel) */}
      <section className="grid min-h-[640px] pt-[140px] lg:grid-cols-[1.02fr_0.98fr]">
        <div className="flex items-center px-6 py-14 sm:px-12 lg:py-20 lg:pl-[max(3rem,calc((100vw-1240px)/2+2rem))] lg:pr-14" style={{ background: t.pastel }}>
          <div className="max-w-[620px]">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-[#361fab] ring-1 ring-[#361fab]/10">
              <Icone className="size-3.5" /> {mod.title}
            </span>
            <h1 className="!mt-6 font-[Sora] !text-[clamp(2.2rem,4.4vw,3.6rem)] !font-semibold !leading-[1.08] !tracking-[-0.03em] !text-[#080331]">
              {p.accroche[0]} {p.accroche[1]}
            </h1>
            <p className="!mt-6 text-[17px] !leading-relaxed !text-[#2d2457]">{p.intro}</p>
            {p.seul && (
              <p className="!mt-4 inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold !text-[#c2410c] ring-1 ring-[#ff887b]/30">
                Se commande aussi seul, sans formalité complète
              </p>
            )}
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="/auth/signup" className="inline-flex items-center gap-2 rounded-xl bg-[#080331] px-6 py-3.5 text-[15px] font-semibold !text-white no-underline shadow-[0_12px_30px_rgba(8,3,49,0.25)] transition-transform hover:-translate-y-0.5">
                Organiser une démo <ArrowRight className="size-4" />
              </a>
              <a href="/independants-tpe" className="inline-flex items-center rounded-xl border border-[#080331]/80 bg-transparent px-6 py-3.5 text-[15px] font-semibold !text-[#080331] no-underline transition-colors hover:bg-white/60">
                Je suis entrepreneur
              </a>
            </div>
          </div>
        </div>

        <div className="relative min-h-[460px] overflow-hidden" style={{ background: t.profond }}>
          {/* Courbes décoratives */}
          <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-10 size-[520px] rounded-full border-[28px] border-white/[0.06]" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-40 size-[460px] rounded-full border-[22px] border-white/[0.05]" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 520px 360px at 80% 20%, rgba(255,255,255,0.14), transparent 65%)' }} />
          {/* Appareil en arrière-plan */}
          <div aria-hidden="true" className="absolute left-[9%] top-[12%] h-[88%] w-[120%] rounded-tl-[34px] bg-[#0b0630]/70 ring-1 ring-white/10" />
          {/* Écran du module, coupé par le bord droit */}
          <div className="absolute left-[15%] top-[19%] w-[min(880px,118%)] rounded-tl-[30px] bg-white/15 p-2.5 pr-0 pb-0 ring-1 ring-white/20 backdrop-blur-sm">
            <div className="overflow-hidden rounded-tl-[22px]">
              {Maquette ? <Maquette v="experts-comptables" /> : null}
            </div>
          </div>
        </div>
      </section>

      {/* Fonctionnement */}
      <section className="bg-[#fcfbff] px-3 pb-16 sm:px-5">
        <div className="theme-fixe relative mx-auto max-w-[1240px] overflow-hidden rounded-[28px] bg-[#080331] px-5 py-12 text-white sm:px-10 sm:py-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(ellipse 640px 420px at 100% 0%, rgba(255,136,123,0.14), transparent 62%), radial-gradient(ellipse 760px 520px at 0% 100%, rgba(54,31,171,0.45), transparent 65%)' }}
          />
          <div className="relative">
            <p className="font-mono !text-[12px] uppercase tracking-[0.18em] !text-white/50">Comment ça marche</p>
            <h2 className="!mt-3 max-w-2xl font-[Sora] !text-[clamp(1.7rem,3.4vw,2.5rem)] !font-semibold !leading-[1.1] !text-white">
              {mod.title}, <span className="bg-gradient-to-r from-[#ffbe8c] via-[#ff887b] to-[#ea42fd] bg-clip-text text-transparent">étape par étape.</span>
            </h2>
            <ol className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
              {p.etapes.map((e, i) => (
                <li key={e.titre} className="bg-[#0b0538] p-6">
                  <span className="font-mono text-[13px] text-[#ff887b]">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="!mt-3 font-[Sora] !text-lg !font-semibold !text-white">{e.titre}</h3>
                  <p className="!mt-2 text-sm !leading-relaxed !text-white/65">{e.texte}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Inclus */}
      <section className="bg-[#fcfbff] py-16 sm:py-20">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <h2 className="font-[Sora] !text-[clamp(1.6rem,3vw,2.2rem)] !font-semibold !leading-tight !text-[var(--violet-900)]">Ce qui est inclus</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {p.inclus.map((x) => (
                <li key={x} className="flex items-start gap-3 rounded-2xl border border-[var(--ink-150)] bg-white px-4 py-3.5 text-[15px] !text-[var(--ink-700)] shadow-[0_6px_18px_rgba(54,31,171,0.05)]">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#ff887b] to-[#ea42fd] text-white"><Check className="size-3" /></span>
                  {x}
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      {/* Autres modules */}
      <section className="bg-[#fcfbff] pb-16 sm:pb-20">
        <Container>
          <h2 className="font-[Sora] !text-[clamp(1.4rem,2.6vw,1.9rem)] !font-semibold !text-[var(--violet-900)]">Les autres modules</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {autres.map((x) => (
              <Link key={x.key} href={x.href} className="group flex gap-3 rounded-2xl border border-[var(--ink-150)] bg-white p-4 no-underline transition-all hover:-translate-y-0.5 hover:border-[var(--violet-300)] hover:shadow-[0_12px_30px_rgba(54,31,171,0.10)]">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-ink)]"><x.icon className="size-5" /></span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1 text-sm font-semibold text-[var(--violet-900)]">{x.title} <ArrowRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" /></span>
                  <span className="mt-0.5 block text-xs leading-snug text-[var(--ink-500)]">{x.desc}</span>
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <CtaBand />
      <FooterV2 />
    </div>
  );
}
