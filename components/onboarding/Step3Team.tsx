'use client';

import { useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import type { InvitationRole, OnboardingData, PendingInvitation } from '@/lib/types/onboarding';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Props = {
  data: OnboardingData;
  onUpdate: (patch: Partial<OnboardingData>) => void;
  onNext: () => void | Promise<void>;
  onPrev: () => void;
};

const ROLES: { value: InvitationRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'collaborator', label: 'Collaborateur' },
  { value: 'readonly', label: 'Lecture seule' },
];

export function Step3Team({ data, onUpdate, onNext, onPrev }: Props) {
  const [draftEmail, setDraftEmail] = useState('');
  const [draftRole, setDraftRole] = useState<InvitationRole>('collaborator');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEmailValid = /^\S+@\S+\.\S+$/.test(draftEmail);
  const alreadyExists = data.invitations.some(
    (i) => i.email.toLowerCase() === draftEmail.trim().toLowerCase(),
  );

  function addInvitation() {
    if (!isEmailValid) {
      setError('Email invalide.');
      return;
    }
    if (alreadyExists) {
      setError('Cet email est déjà dans la liste.');
      return;
    }
    setError(null);
    const next: PendingInvitation[] = [
      ...data.invitations,
      { email: draftEmail.trim(), role: draftRole },
    ];
    onUpdate({ invitations: next });
    setDraftEmail('');
    setDraftRole('collaborator');
  }

  function removeInvitation(email: string) {
    onUpdate({
      invitations: data.invitations.filter((i) => i.email !== email),
    });
  }

  function changeRole(email: string, role: InvitationRole) {
    onUpdate({
      invitations: data.invitations.map((i) => (i.email === email ? { ...i, role } : i)),
    });
  }

  async function handleNext() {
    setError(null);
    setSubmitting(true);
    try {
      await onNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de sauvegarde.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h2 className="text-[22px] font-semibold tracking-tight text-foreground">
        Invitez votre équipe
      </h2>
      <p className="mb-5 mt-1.5 text-sm text-muted-foreground">
        Ajoutez les emails de vos collaborateurs. Les invitations seront stockées et envoyées dans
        une phase future (MVP : pas d&apos;envoi d&apos;email).
      </p>

      <div className="flex flex-wrap items-end gap-2.5">
        <div className="min-w-52 flex-1 space-y-1.5">
          <Label htmlFor="inviteEmail">Inviter par email</Label>
          <Input
            id="inviteEmail"
            type="email"
            value={draftEmail}
            onChange={(e) => setDraftEmail(e.target.value)}
            placeholder="collaborateur@cabinet.fr"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addInvitation();
              }
            }}
          />
        </div>
        <div className="w-40 space-y-1.5">
          <Label htmlFor="inviteRole">Rôle</Label>
          <Select value={draftRole} onValueChange={(v) => setDraftRole(v as InvitationRole)}>
            <SelectTrigger id="inviteRole" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" variant="outline" onClick={addInvitation} disabled={!isEmailValid}>
          <Plus className="size-4" aria-hidden="true" />
          Ajouter
        </Button>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {data.invitations.length > 0 ? (
        <div className="mt-5 divide-y overflow-hidden rounded-lg border bg-card">
          {data.invitations.map((inv) => (
            <div key={inv.email} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="flex-1 truncate text-foreground">{inv.email}</span>
              <Select
                value={inv.role}
                onValueChange={(v) => changeRole(inv.email, v as InvitationRole)}
              >
                <SelectTrigger size="sm" className="w-36" aria-label={`Rôle de ${inv.email}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={() => removeInvitation(inv.email)}
                aria-label={`Retirer ${inv.email}`}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-5 text-[13px] italic text-muted-foreground">
          Aucune invitation en attente. Vous pouvez passer cette étape et inviter plus tard depuis
          les réglages.
        </p>
      )}

      <div className="mt-8 flex justify-between gap-3">
        <Button type="button" variant="ghost" onClick={onPrev}>
          ← Précédent
        </Button>
        <Button type="button" onClick={handleNext} disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Sauvegarde…
            </>
          ) : (
            'Suivant →'
          )}
        </Button>
      </div>
    </div>
  );
}
