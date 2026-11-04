'use client';

// Mémoire de l'agent sur un client : ce qu'il a retenu (ou ce que le cabinet a noté),
// relu à chaque échange sur un dossier de ce client. Le cabinet ajoute, corrige, supprime.

import { useState, useTransition } from 'react';
import { Bot, Check, Loader2, Pencil, Plus, Trash2, User, X } from 'lucide-react';
import { ajouterNoteClient, modifierNoteClient, supprimerNoteClient } from '@/lib/server-actions/aujourdhui';
import { formatDateFr } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

export type NoteMemoire = { id: string; contenu: string; source: 'agent' | 'cabinet'; updated_at: string };

const MAX = 500;

export function MemoireClient({ clientId, notes, indisponible = false }: { clientId: string; notes: NoteMemoire[]; indisponible?: boolean }) {
  const [edition, setEdition] = useState<string | null>(null); // id en cours de correction, ou 'nouvelle'
  const [texte, setTexte] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  function ouvrir(id: string, contenu = '') {
    setEdition(id);
    setTexte(contenu);
    setErreur(null);
  }

  function enregistrer() {
    demarrer(async () => {
      const r = edition === 'nouvelle'
        ? await ajouterNoteClient(clientId, texte)
        : await modifierNoteClient(edition as string, clientId, texte);
      if (r.error) return setErreur(r.error);
      setEdition(null);
      setTexte('');
    });
  }

  function supprimer(id: string) {
    demarrer(async () => {
      const r = await supprimerNoteClient(id, clientId);
      if (r.error) setErreur(r.error);
    });
  }

  const formulaire = (
    <div className="space-y-2">
      <Textarea
        autoFocus
        value={texte}
        maxLength={MAX}
        rows={3}
        onChange={(e) => setTexte(e.target.value)}
        placeholder="Ex. : Préfère la publication des annonces dans Le Parisien."
        aria-label="Note de mémoire"
        className="text-sm"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] tabular-nums text-muted-foreground">{texte.length}/{MAX}</span>
        <div className="flex gap-1.5">
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEdition(null)}>
            <X className="size-3.5" /> Annuler
          </Button>
          <Button type="button" size="sm" className="h-7 px-2.5 text-xs" disabled={enCours || !texte.trim()} onClick={enregistrer}>
            {enCours ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} Enregistrer
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <Card className="h-fit min-w-0 gap-0 py-0">
      <CardHeader className="flex flex-row items-start justify-between gap-2 border-b px-5 py-4 [.border-b]:pb-4">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-sm">Mémoire de l&apos;agent</CardTitle>
          <CardDescription className="text-xs">Relue à chaque échange sur un dossier de ce client</CardDescription>
        </div>
        {!indisponible && edition !== 'nouvelle' && (
          <Button type="button" size="sm" variant="ghost" className="h-7 shrink-0 px-2 text-xs" onClick={() => ouvrir('nouvelle')}>
            <Plus className="size-3.5" /> Ajouter
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3 px-5 py-4">
        {indisponible && <p className="text-xs text-muted-foreground">Mémoire bientôt disponible.</p>}
        {!indisponible && notes.length === 0 && edition !== 'nouvelle' && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Rien pour l&apos;instant. L&apos;agent y note les préférences et particularités de ce client au fil des dossiers ; vous pouvez aussi en ajouter.
          </p>
        )}
        {notes.length > 0 && (
          <ul className="space-y-2">
            {notes.map((n) => (
              <li key={n.id} className="group rounded-md border bg-muted/30 p-2.5">
                {edition === n.id ? formulaire : (
                  <>
                    <p className="text-sm leading-snug break-words">{n.contenu}</p>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        {n.source === 'agent' ? <Bot className="size-3" aria-hidden /> : <User className="size-3" aria-hidden />}
                        {n.source === 'agent' ? 'Retenu par l’agent' : 'Noté par le cabinet'} · {formatDateFr(n.updated_at)}
                      </span>
                      <span className="flex gap-0.5 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                        <Button type="button" size="icon" variant="ghost" className="size-6" aria-label="Corriger la note" onClick={() => ouvrir(n.id, n.contenu)}>
                          <Pencil className="size-3" />
                        </Button>
                        <Button type="button" size="icon" variant="ghost" className="size-6 text-muted-foreground hover:text-destructive" aria-label="Supprimer la note" disabled={enCours} onClick={() => supprimer(n.id)}>
                          <Trash2 className="size-3" />
                        </Button>
                      </span>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        {edition === 'nouvelle' && formulaire}
        {erreur && <p role="alert" className="text-xs text-destructive">{erreur}</p>}
      </CardContent>
    </Card>
  );
}
