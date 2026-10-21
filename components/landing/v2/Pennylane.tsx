'use client';

// Sections des pages métier, sur la structure de Pennylane, aux couleurs Legaly :
// modules en tuiles + écran du logiciel, engagements envers la profession, grille
// de réassurance, bande des connexions officielles, fin de page avec appareils.

import { useState } from 'react';
import {
  ArrowRight, BookOpen, Check, CreditCard, FileSignature, Layers, Lock, Megaphone, MessageSquare,
  Network, ShieldCheck, Sparkles, Stamp, Users,
} from 'lucide-react';
import type { Module } from '@/lib/landing/metiers';
import { Logo, LogoMark } from '@/components/brand/Logo';
import { Container } from '../ui';
import { MAQUETTES, MaquetteFormalites, type Variante } from './Maquettes';
import { cn } from '@/lib/utils';

const ICONES: Record<string, typeof Check> = {
  agent: Sparkles, lots: Layers, annonces: Megaphone, rne: BookOpen, regularisation: Stamp,
  paiement: CreditCard, signature: FileSignature, entites: Network, formalites: Users,
};

// ── 1. Modules en tuiles + écran ──
export function Modules({ titre, modules, v }: { titre: [string, string]; modules: Module[]; v: Variante }) {
  const [actif, setActif] = useState(0);
  const m = modules[actif];
  const Maquette = MAQUETTES[m.key];
  return (
    <section className="relative overflow-hidden bg-[#fcfbff] py-20 sm:py-24">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 760px 480px at 90% 0%, rgba(117,81,232,0.10), transparent 62%), radial-gradient(ellipse 520px 380px at 0% 100%, rgba(255,136,123,0.08), transparent 60%)' }} />
      <Container className="relative">
        <h2 className="max-w-3xl font-[Sora] !text-[clamp(1.8rem,3.6vw,2.7rem)] !font-semibold !leading-[1.12] !text-[var(--violet-900)]">
          {titre[0]} <span className="bg-gradient-to-r from-[#4a2bc4] via-[#7551e8] to-[#c13ad6] bg-clip-text text-transparent">{titre[1]}</span>
        </h2>

        <div className="mt-10 rounded-2xl border border-[var(--violet-100)] p-3 sm:p-4" style={{ background: 'linear-gradient(120deg, var(--bande-1, #f4f0ff), var(--bande-2, #fbf3fd) 60%, var(--bande-3, #fff5f2))' }}>
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {modules.map((x, i) => {
              const Icone = ICONES[x.key] ?? Sparkles;
              const on = i === actif;
              return (
                <button
                  key={x.key}
                  type="button"
                  onClick={() => setActif(i)}
                  className={cn('flex min-w-[104px] flex-1 flex-col items-center gap-2 rounded-2xl px-2 py-3 transition-all', on ? 'bg-white shadow-[0_6px_18px_rgba(20,13,46,0.08)]' : 'hover:bg-white/70')}
                >
                  <span
                    className={cn('grid size-14 place-items-center rounded-xl border transition-colors', on ? 'border-transparent bg-gradient-to-br from-[#361fab] to-[#a43bc9] text-white shadow-[0_8px_18px_rgba(54,31,171,0.3)]' : 'border-[var(--violet-100)] bg-white text-[var(--violet-700)]')}
                  >
                    <Icone className="size-6" />
                  </span>
                  <span className={cn('text-center text-[12px] leading-tight', on ? 'font-semibold !text-[var(--violet-900)]' : '!text-[var(--ink-600)]')}>{x.nom}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div key={m.key} className="mt-12 grid items-center gap-10 lg:grid-cols-[0.8fr_1.2fr] animate-[heroSceneIn_.4s_ease-out]">
          <div>
            <span className="inline-flex items-center gap-2 text-sm font-semibold !text-[var(--violet-900)]">
              <span className="grid size-5 place-items-center rounded-full bg-gradient-to-br from-[#7551e8] to-[#c13ad6] text-white"><Check className="size-3" /></span>
              Legaly {m.nom}
            </span>
            <h3 className="!mt-4 font-[Sora] !text-[clamp(1.8rem,3.4vw,2.6rem)] !font-semibold !leading-[1.08] !text-[var(--violet-900)]">{m.titre}</h3>
            <p className="!mt-5 text-[16px] !leading-relaxed !text-[var(--ink-600)]">{m.texte}</p>
            <a href="/auth/signup" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#361fab] to-[#7551e8] px-5 py-3 text-sm font-semibold !text-white no-underline shadow-[0_10px_24px_rgba(54,31,171,0.25)] transition-transform hover:-translate-y-0.5">
              Essayer <ArrowRight className="size-4" />
            </a>
          </div>
          <div>{Maquette ? <Maquette v={v} /> : null}</div>
        </div>
      </Container>
    </section>
  );
}

// ── 2. Engagements envers la profession ──
export function Engagements({ titre, points }: { titre: string; points: string[] }) {
  return (
    <section className="bg-gradient-to-b from-[#fcfbff] to-[#f6f2ff] px-3 py-14 sm:px-6">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl border border-[var(--ink-100)] bg-white px-6 py-12 shadow-[0_10px_30px_rgba(20,13,46,0.05)] sm:px-12">
        <div className="relative z-10 max-w-xl">
          <h2 className="font-[Sora] !text-[clamp(1.6rem,3vw,2.3rem)] !font-semibold !leading-tight !text-[var(--violet-900)]">{titre}</h2>
          <ul className="mt-7 space-y-4">
            {points.map((p) => (
              <li key={p} className="flex items-start gap-3 text-[15px] text-[var(--ink-700)]">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#ff887b] to-[#c13ad6] text-white"><Check className="size-3" /></span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-10 -right-6 opacity-[0.10] sm:right-10">
          <LogoMark size={280} />
        </div>
      </div>
    </section>
  );
}

// ── 3. Grille de réassurance ──
export function Reassurance({ adapte, nouveautes }: { adapte: { titre: string; texte: string; paliers: string[] }; nouveautes: { t: string; s: 'Déployé' | 'En cours' }[] }) {
  return (
    <section className="relative overflow-hidden bg-[#f6f2ff] pb-16 sm:pb-20">
      <Container className="relative grid gap-5 lg:grid-cols-3">
        <article className="relative overflow-hidden rounded-2xl border border-[var(--ink-100)] bg-white p-7">
          <h3 className="font-[Sora] !text-2xl !font-semibold !text-[var(--violet-900)]">Conçu en France</h3>
          <p className="!mt-2 text-sm !text-[var(--ink-600)]">Pensé pour le droit des sociétés français, le Guichet unique et le RNE.</p>
          <svg viewBox="0 0 206 200" className="absolute -bottom-4 -right-2 h-56 w-56 text-[#7551e8]/20" fill="currentColor" aria-hidden="true">
            <path d="M108 10 L128 18 L150 30 L172 44 L190 64 L186 88 L184 110 L170 124 L176 140 L180 158 L184 170 L164 176 L146 180 L124 176 L104 184 L100 196 L78 192 L56 186 L40 180 L44 158 L46 138 L40 116 L30 102 L8 88 L6 80 L30 72 L46 70 L60 60 L74 56 L86 48 L98 30 Z" /><ellipse cx="196" cy="182" rx="5" ry="11" />
          </svg>
        </article>
        <article className="relative overflow-hidden rounded-2xl border border-[var(--ink-100)] bg-white p-7">
          <h3 className="font-[Sora] !text-2xl !font-semibold !text-[var(--violet-900)]">Sécurisé</h3>
          <p className="!mt-2 text-sm !text-[var(--ink-600)]">Identifiants INPI chiffrés, données cloisonnées par cabinet, aucun dépôt sans validation humaine.</p>
          <div className="mx-auto mt-6 grid size-32 place-items-center rounded-2xl border border-[var(--violet-100)] bg-gradient-to-br from-[#f1ecff] to-[#fbf0fb]">
            <Lock className="size-12 text-[var(--violet-700)]" />
          </div>
        </article>
        <article className="rounded-2xl border border-[var(--ink-100)] bg-white p-7">
          <h3 className="font-[Sora] !text-2xl !font-semibold"><span className="bg-gradient-to-r from-[#4a2bc4] via-[#7551e8] to-[#c13ad6] bg-clip-text text-transparent">Évolutif</span></h3>
          <p className="!mt-2 text-sm !text-[var(--ink-600)]">De nouvelles fonctions chaque mois, construites avec les cabinets.</p>
          <ul className="mt-5 space-y-2">
            {nouveautes.map((n) => (
              <li key={n.t} className="flex items-center justify-between gap-2 rounded-xl border border-[var(--ink-100)] px-3 py-2 text-[13px] text-[var(--violet-900)]">
                {n.t}
                <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold', n.s === 'Déployé' ? 'bg-emerald-50 text-emerald-700' : 'bg-[#361fab] text-white')}>{n.s}</span>
              </li>
            ))}
          </ul>
        </article>
        <article className="rounded-2xl border border-[var(--ink-100)] bg-white p-7 lg:col-span-1">
          <h3 className="font-[Sora] !text-2xl !font-semibold !text-[var(--violet-900)]">À vos côtés à chaque étape</h3>
          <p className="!mt-2 text-sm !text-[var(--ink-600)]">L’agent répond dans le chat, explique ce qu’il a préparé et ce qu’il vous reste à faire.</p>
          <div className="mt-6 space-y-2 text-[12px]">
            <div className="ml-auto w-fit rounded-xl bg-[var(--violet-600)] px-3 py-2 text-white">Il manque quoi pour déposer ?</div>
            <div className="flex gap-2">
              <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-[#ede7ff]"><MessageSquare className="size-3.5 text-[var(--violet-700)]" /></span>
              <div className="rounded-xl bg-[var(--violet-50)] px-3 py-2 text-[var(--violet-900)]">La pièce d’identité du président et l’attestation de dépôt des fonds. Le reste est prêt.</div>
            </div>
          </div>
        </article>
        <article className="relative overflow-hidden rounded-2xl border border-[var(--ink-100)] p-7 lg:col-span-2" style={{ background: 'linear-gradient(120deg, var(--surface, #ffffff) 45%, var(--bande-2, #f6f0ff) 80%, var(--bande-3, #fff3f0))' }}>
          <h3 className="font-[Sora] !text-2xl !font-semibold !text-[var(--violet-900)]">{adapte.titre}</h3>
          <p className="!mt-2 max-w-md text-sm !text-[var(--ink-600)]">{adapte.texte}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {adapte.paliers.map((p, i) => (
              <span key={p} className="flex items-center gap-2 rounded-xl border border-[var(--ink-150)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--violet-900)]">
                <span className="grid size-7 place-items-center rounded-lg text-white" style={{ background: ['#5b36d6', '#a43bc9', '#e2675c'][i % 3] }}><Users className="size-3.5" /></span>
                {p}
              </span>
            ))}
          </div>
        </article>
      </Container>
    </section>
  );
}

// ── 4. Bande des connexions (panneau sombre, éléments en orbite) ──
export function Connexions() {
  const orbite = [
    { t: 'Guichet unique INPI', x: '8%', y: '18%' },
    { t: 'RNE', x: '30%', y: '6%' },
    { t: 'INSEE', x: '52%', y: '20%' },
    { t: 'Signature', x: '14%', y: '68%' },
    { t: 'Paiement', x: '46%', y: '76%' },
  ];
  return (
    <section className="bg-gradient-to-b from-[#f6f2ff] to-[#fcfbff] px-3 py-6 sm:px-6">
      <div className="theme-fixe relative mx-auto grid max-w-[1400px] items-center gap-10 overflow-hidden rounded-[32px] bg-[#140d2e] px-6 py-16 sm:rounded-[44px] sm:px-14 lg:grid-cols-2">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 700px 500px at 85% 50%, rgba(117,81,232,0.42), transparent 62%), radial-gradient(ellipse 520px 380px at 0% 0%, rgba(193,58,214,0.18), transparent 60%)' }} />
        <div className="relative">
          <h2 className="font-[Sora] !text-[clamp(1.6rem,3vw,2.4rem)] !font-semibold !leading-tight !text-white">
            Connecté aux <span className="bg-gradient-to-r from-[#c4b5fd] to-[#f0abfc] bg-clip-text text-transparent">registres officiels</span>, Legaly s’intègre à votre façon de travailler.
          </h2>
          <a href="/#securite" className="mt-6 inline-flex items-center gap-1.5 border-b border-white/40 pb-0.5 text-sm font-semibold !text-white no-underline">En savoir plus <ArrowRight className="size-4" /></a>
        </div>
        <div className="relative h-64 sm:h-72">
          {[1, 2, 3].map((r) => (
            <span key={r} aria-hidden="true" className="absolute right-[8%] top-1/2 -translate-y-1/2 rounded-full border border-white/10" style={{ width: r * 150, height: r * 150, marginRight: -(r * 75) + 60 }} />
          ))}
          <div className="absolute right-[8%] top-1/2 grid size-28 -translate-y-1/2 place-items-center rounded-full border-4 border-white/80 bg-white shadow-[0_0_50px_rgba(117,81,232,0.35)]">
            <LogoMark size={64} />
          </div>
          {orbite.map((o, i) => (
            <span key={o.t} className={cn('absolute rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur', i % 2 ? 'bp-float-slow' : 'bp-float')} style={{ left: o.x, top: o.y }}>
              <span className="mr-1.5 inline-block size-1.5 rounded-full align-middle" style={{ background: ['#a78bfa', '#f0abfc', '#fda4af', '#fcd34d', '#a78bfa'][i] }} />
              {o.t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── 5. Fin de page : tout ce dont vous avez besoin + appareils ──
export function FinAppareils({ titre, v }: { titre: [string, string]; v: Variante }) {
  return (
    <section className="relative overflow-hidden bg-[#fcfbff] pb-10 pt-20 sm:pt-24">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 760px 480px at 90% 0%, rgba(117,81,232,0.10), transparent 62%), radial-gradient(ellipse 520px 380px at 0% 100%, rgba(255,136,123,0.08), transparent 60%)' }} />
      <Container className="relative text-center">
        <h2 className="!mx-auto max-w-3xl font-[Sora] !text-[clamp(1.9rem,4vw,3rem)] !font-semibold !leading-tight !text-[var(--violet-900)]">
          {titre[0]} <span className="bg-gradient-to-r from-[#4a2bc4] via-[#7551e8] to-[#c13ad6] bg-clip-text text-transparent">{titre[1]}</span>
        </h2>
        <p className="!mx-auto !mt-3 flex items-center justify-center gap-1.5 text-sm !text-[var(--ink-500)]"><ShieldCheck className="size-4 text-[var(--violet-600)]" /> Abonnement mensuel sans engagement</p>
        <a href="/auth/signup" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#361fab] to-[#7551e8] px-6 py-3 text-[15px] font-semibold !text-white no-underline shadow-[0_10px_24px_rgba(54,31,171,0.25)] transition-transform hover:-translate-y-0.5">
          Démarrer maintenant <ArrowRight className="size-4" />
        </a>

        <div className="relative mx-auto mt-14 max-w-4xl">
          {/* Ordinateur */}
          <div className="mx-auto w-[92%] rounded-t-[22px] border-[10px] border-b-0 border-[#1d1838] bg-[#1d1838] shadow-[0_40px_80px_rgba(20,13,46,0.35)]">
            <div className="overflow-hidden rounded-t-xl bg-white">
              <div className="scale-[1.0]">
                <MaquetteFormalites v={v} />
              </div>
            </div>
          </div>
          <div className="mx-auto h-4 w-full rounded-b-[18px] bg-gradient-to-b from-[#d9d4e8] to-[#b9b2cf]" />
          <div className="mx-auto h-1.5 w-1/4 rounded-b-xl bg-[#a8a1c0]" />
          {/* Téléphone */}
          <div className="absolute -left-2 bottom-2 hidden w-40 rounded-[28px] border-[7px] border-[#1d1838] bg-white p-3 text-left shadow-[0_24px_50px_rgba(20,13,46,0.35)] sm:block">
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-[#1d1838]/30" />
            <Logo size={16} textClassName="text-[11px]" />
            <p className="mt-3 text-[9px] font-semibold uppercase tracking-wider text-[var(--violet-600)]">Notification</p>
            <p className="mt-1 text-[11px] font-semibold text-[var(--violet-900)]">Brouillon prêt à signer</p>
            <p className="mt-1 text-[10px] text-[var(--ink-500)]">Les actes et le brouillon INPI sont prêts.</p>
            <div className="mt-2 rounded-lg bg-gradient-to-r from-[#361fab] to-[#a43bc9] py-1.5 text-center text-[10px] font-semibold text-white">Ouvrir</div>
          </div>
        </div>
      </Container>
    </section>
  );
}
