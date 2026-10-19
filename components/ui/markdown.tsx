'use client';

// Rendu Markdown léger et stylé (sans plugin typography) pour les réponses de
// l'assistant : titres, listes, gras, liens, code, tableaux, citations.

import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

// Les modèles écrivent souvent <br> dans les cellules de tableau (Markdown n'a pas de
// saut de ligne dans un tableau) : on le rend comme un vrai saut de ligne, sans
// interpréter de HTML.
const BR = 'br';
function sautsDeLigne(nodes: React.ReactNode): React.ReactNode {
  const list = Array.isArray(nodes) ? nodes : [nodes];
  return list.flatMap((n, i) =>
    typeof n === 'string' && n.includes(BR)
      ? n.split(BR).flatMap((part, j) => (j ? [<br key={`${i}-${j}`} />, part] : [part]))
      : [n],
  );
}

// Mémorisé : un message déjà affiché n'est pas re-analysé à chaque fragment du suivant
export const Markdown = memo(function Markdown({ children, className }: { children: string; className?: string }) {
  const source = children.replace(/<br\s*\/?>/gi, BR);
  return (
    <div className={cn('text-sm leading-relaxed', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-3 text-pretty last:mb-0">{children}</p>,
          h1: ({ children }) => <h1 className="mb-2 mt-5 text-base font-semibold tracking-tight first:mt-0">{children}</h1>,
          h2: ({ children }) => (
            <h2 className="mb-2 mt-5 border-b pb-1.5 text-[15px] font-semibold tracking-tight first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => <h3 className="mb-1.5 mt-4 text-sm font-semibold first:mt-0">{children}</h3>,
          h4: ({ children }) => (
            <h4 className="mb-1.5 mt-3 font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground first:mt-0">
              {children}
            </h4>
          ),
          ul: ({ children }) => (
            <ul className="mb-3 ml-5 list-disc space-y-1 marker:text-muted-foreground/70 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 ml-5 list-decimal space-y-1 marker:font-mono marker:text-xs marker:text-muted-foreground last:mb-0">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="pl-1 [&>ol]:mb-0 [&>ol]:mt-1 [&>ul]:mb-0 [&>ul]:mt-1">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              className="font-medium text-primary underline decoration-primary/30 underline-offset-2 transition-colors hover:decoration-primary"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-2 border-brand-border pl-3 text-muted-foreground">
              {children}
            </blockquote>
          ),
          code: ({ className: c, children }) => {
            const isBlock = /language-/.test(c || '');
            if (isBlock) {
              return <code className="block font-mono text-xs leading-relaxed">{children}</code>;
            }
            return (
              <code className="rounded border bg-muted/60 px-1 py-px font-mono text-[0.85em]">{children}</code>
            );
          },
          pre: ({ children }) => (
            <pre className="mb-3 overflow-x-auto rounded-lg border bg-muted/50 p-3 last:mb-0">{children}</pre>
          ),
          hr: () => <hr className="my-4 border-border" />,
          table: ({ children }) => (
            <div className="mb-3 overflow-x-auto rounded-lg border last:mb-0">
              <table className="w-full border-collapse text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="border-b bg-muted/50">{children}</thead>,
          tr: ({ children }) => <tr className="border-b last:border-b-0">{children}</tr>,
          th: ({ children }) => (
            <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-muted-foreground">{sautsDeLigne(children)}</th>
          ),
          td: ({ children }) => <td className="px-3 py-2 align-top">{sautsDeLigne(children)}</td>,
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
});
