// Hero photo des pages métier (esprit Skello) : grande photo aux coins arrondis
// sous la barre de navigation, titre et appels à l'action en blanc sur la partie
// sombre de l'image, à gauche.

import Image from 'next/image';
import { ArrowRight, Check } from 'lucide-react';

export function HeroPhoto({
  image,
  alt,
  kicker,
  ligne1,
  ligne2,
  sousTitre,
  points,
}: {
  image: string;
  alt: string;
  kicker: string;
  ligne1: string;
  ligne2: string;
  sousTitre: string;
  points: string[];
}) {
  return (
    <section className="bg-[#fcfbff] px-3 pb-10 pt-[5.5rem] sm:px-5 lg:pt-24">
      <div className="relative mx-auto flex min-h-[620px] w-full max-w-[1440px] items-center overflow-hidden rounded-[28px] bg-[#1a1450] lg:min-h-[640px]">
        <Image
          src={image}
          alt={alt}
          fill
          priority
          sizes="(min-width: 1440px) 1440px, 100vw"
          className="object-cover object-[72%_center]"
        />
        {/* Assombrit la gauche pour la lecture du texte (plus fort sur mobile, où la photo est recadrée) */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(90deg,rgba(18,12,64,0.92)_0%,rgba(24,16,84,0.78)_38%,rgba(24,16,84,0.25)_62%,transparent_80%)] max-lg:bg-[linear-gradient(180deg,rgba(18,12,64,0.55)_0%,rgba(18,12,64,0.88)_100%)]"
        />
        <div className="relative w-full px-6 py-14 sm:px-12 lg:px-16">
          <div className="max-w-[36rem]">
            <span className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold !text-white backdrop-blur-sm">
              {kicker}
            </span>
            <h1 className="!mt-6 font-[Sora] !text-[clamp(2.2rem,4.4vw,3.5rem)] !font-bold !leading-[1.05] !tracking-[-0.03em] !text-white">
              {ligne1}
              <br />
              <span className="bg-gradient-to-r from-[#c9b8ff] via-[#e3a8ff] to-[#ff9ed8] bg-clip-text text-transparent">{ligne2}</span>
            </h1>
            <p className="!mt-6 max-w-xl text-base !leading-relaxed !text-white/80 sm:text-lg">{sousTitre}</p>
            <ul className="mt-6 space-y-2">
              {points.map((p) => (
                <li key={p} className="flex items-start gap-2 text-[15px] !text-white/90">
                  <Check className="mt-0.5 size-4 shrink-0 text-[#e3a8ff]" /> {p}
                </li>
              ))}
            </ul>
            <div className="mt-9 flex flex-wrap gap-3">
              <a href="/auth/signup" className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-[15px] font-semibold !text-[#1a1450] no-underline shadow-[0_10px_24px_rgba(0,0,0,0.18)] transition-transform hover:-translate-y-0.5">
                Créer un compte <ArrowRight className="size-4" />
              </a>
              <a href="/auth/signup" className="inline-flex items-center rounded-lg border border-white/40 bg-white/5 px-6 py-3 text-[15px] font-semibold !text-white no-underline backdrop-blur-sm transition-colors hover:bg-white/15">
                Demander une démo
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
