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

export function ModulePage({ module: mod }: { module: LandingModule }) {
  const p = mod.page;
  const Maquette = MAQUETTES[p.maquette];
  const autres = MODULE_LIST.filter((x) => x.key !== mod.key);
  const Icone = mod.icon;

  return (
    <div className="landing-theme">
      <Nav surface="light" />

      {/* En-tête */}
      <section className="relative overflow-hidden bg-[#fcfbff]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 900px 620px at 78% 30%, rgba(117,81,232,0.16), transparent 65%), radial-gradient(ellipse 620px 460px at 0% 0%, rgba(255,136,123,0.12), transparent 60%)' }}
        />
        <div className="relative mx-auto grid w-full max-w-[1240px] items-center gap-12 px-5 pb-20 pt-40 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:pt-44">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--violet-200)] bg-[var(--violet-50)] px-3 py-1 text-xs font-semibold text-[var(--violet-700)]">
              <Icone className="size-3.5" /> Module · {mod.title}
            </span>
            <h1 className="!mt-6 font-[Sora] !text-[clamp(2.1rem,4.4vw,3.4rem)] !font-bold !leading-[1.05] !tracking-[-0.03em] !text-[var(--violet-900)]">
              {p.accroche[0]}
              <br />
              <span className="bg-gradient-to-r from-[#ffbe8c] via-[#ff887b] to-[#ea42fd] bg-clip-text text-transparent">{p.accroche[1]}</span>
            </h1>
            <p className="!mt-6 max-w-xl text-base !leading-relaxed !text-[var(--ink-600)] sm:text-lg">{p.intro}</p>
            {p.seul && (
              <p className="!mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold !text-[var(--accent-ink)]">
                Se commande aussi seul, sans formalité complète
              </p>
            )}
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="/auth/signup" className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-[15px] font-semibold !text-[#080331] no-underline shadow-[0_12px_30px_rgba(255,136,123,0.4)] transition-transform hover:-translate-y-0.5">
                Essayer avec mon cabinet <ArrowRight className="size-4" />
              </a>
              <a href="/independants-tpe" className="inline-flex items-center rounded-full border border-[var(--ink-200)] bg-white px-6 py-3 text-[15px] font-semibold !text-[var(--violet-900)] no-underline transition-colors hover:border-[var(--violet-500)]">
                Je suis entrepreneur
              </a>
            </div>
          </div>
          <div>{Maquette ? <Maquette v="experts-comptables" /> : null}</div>
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
