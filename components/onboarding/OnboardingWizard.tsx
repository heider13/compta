'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type {
  InpiEnv,
  OnboardingData,
  OrganizationForOnboarding,
  OrgPlan,
  PendingInvitation,
} from '@/lib/types/onboarding';
import { ProgressBar } from './ProgressBar';
import { Step1Cabinet } from './Step1Cabinet';
import { Step2Inpi } from './Step2Inpi';
import { Step3Team } from './Step3Team';
import { Step4Plan } from './Step4Plan';

type Props = {
  org: OrganizationForOnboarding;
  userId: string;
};

const STEPS = ['Cabinet', 'INPI', 'Équipe', 'Plan'];

function normalizePlan(plan: string | null): OrgPlan {
  if (plan === 'pro' || plan === 'enterprise' || plan === 'cabinet') return plan;
  return 'cabinet';
}

function normalizeEnv(env: string | null): InpiEnv {
  return env === 'demo' ? 'demo' : 'prod';
}

function readInvitations(whiteLabel: Record<string, unknown> | null): PendingInvitation[] {
  if (!whiteLabel) return [];
  const raw = (whiteLabel as { pending_invitations?: unknown }).pending_invitations;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (item): item is PendingInvitation =>
        !!item &&
        typeof item === 'object' &&
        typeof (item as PendingInvitation).email === 'string' &&
        ['admin', 'collaborator', 'readonly'].includes(
          (item as PendingInvitation).role as string,
        ),
    )
    .map((i) => ({ email: i.email, role: i.role }));
}

export function OnboardingWizard({ org, userId: _userId }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [step, setStep] = useState(1);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [data, setData] = useState<OnboardingData>({
    cabinetName: org.name ?? '',
    siren: org.siren ?? '',
    contactEmail: org.contact_email ?? '',
    contactPhone: org.contact_phone ?? '',
    inpiUsername: org.inpi_username ?? '',
    inpiPassword: '', // jamais re-rempli depuis la DB (chiffré)
    inpiEnv: normalizeEnv(org.inpi_env),
    invitations: readInvitations(org.white_label_config),
    plan: normalizePlan(org.plan),
  });

  const handleUpdate = useCallback((patch: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...patch }));
  }, []);

  // Sauvegarde partielle dans `organizations`.
  // `extra` permet de fusionner des champs JSONB calculés (ex : white_label_config).
  const persistPartial = useCallback(
    async (
      patch: Partial<OnboardingData>,
      extra: Record<string, unknown> = {},
    ): Promise<void> => {
      const update: Record<string, unknown> = { ...extra };

      if (patch.cabinetName !== undefined) update.name = patch.cabinetName.trim();
      if (patch.siren !== undefined) update.siren = patch.siren.replace(/\s+/g, '');
      if (patch.contactEmail !== undefined)
        update.contact_email = patch.contactEmail.trim() || null;
      if (patch.contactPhone !== undefined)
        update.contact_phone = patch.contactPhone.trim() || null;
      if (patch.inpiUsername !== undefined)
        update.inpi_username = patch.inpiUsername.trim() || null;
      if (patch.inpiPassword !== undefined && patch.inpiPassword !== '') {
        // TODO: chiffrer côté backend avec une clé de cabinet (KMS / pgcrypto).
        // Backend INPI ciblé : https://vps-84ac2579.vps.ovh.net — endpoint dédié à créer.
        // Pour le MVP on envoie en clair vers `inpi_password_encrypted`.
        update.inpi_password_encrypted = patch.inpiPassword;
      }
      if (patch.inpiEnv !== undefined) update.inpi_env = patch.inpiEnv;
      if (patch.plan !== undefined) update.plan = patch.plan;

      const { error } = await supabase
        .from('organizations')
        .update(update)
        .eq('id', org.id);

      if (error) {
        throw new Error(error.message);
      }
    },
    [org.id, supabase],
  );

  // Sauvegarde des invitations dans `organizations.white_label_config.pending_invitations`.
  // (Le schéma ne dispose pas d'un `metadata jsonb` sur `organizations` — on réutilise
  // le jsonb existant `white_label_config` qui est non-null par défaut.)
  // TODO: à terme, table dédiée `org_invitations` + envoi email via backend.
  const persistInvitations = useCallback(
    async (invitations: PendingInvitation[]): Promise<void> => {
      const nextWhiteLabel = {
        ...(org.white_label_config ?? {}),
        pending_invitations: invitations,
      };
      const { error } = await supabase
        .from('organizations')
        .update({ white_label_config: nextWhiteLabel })
        .eq('id', org.id);
      if (error) {
        throw new Error(error.message);
      }
    },
    [org.id, org.white_label_config, supabase],
  );

  const goPrev = useCallback(() => {
    setGlobalError(null);
    setStep((s) => Math.max(1, s - 1));
  }, []);

  const handleStep1Next = useCallback(async () => {
    await persistPartial({
      cabinetName: data.cabinetName,
      siren: data.siren,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
    });
    setStep(2);
  }, [data, persistPartial]);

  const handleStep2Next = useCallback(async () => {
    await persistPartial({
      inpiUsername: data.inpiUsername,
      inpiPassword: data.inpiPassword,
      inpiEnv: data.inpiEnv,
    });
    setStep(3);
  }, [data, persistPartial]);

  const handleStep3Next = useCallback(async () => {
    await persistInvitations(data.invitations);
    setStep(4);
  }, [data.invitations, persistInvitations]);

  const handleStep4Finish = useCallback(async () => {
    // Sauvegarde finale du plan (la sauvegarde partielle des étapes précédentes a déjà eu lieu).
    await persistPartial({ plan: data.plan });
    router.push('/dashboard');
    router.refresh();
  }, [data.plan, persistPartial, router]);

  return (
    <div className="card-elev" style={{ padding: 32 }}>
      <ProgressBar steps={STEPS} current={step} />

      {globalError && (
        <div
          style={{
            marginBottom: 16,
            padding: '10px 12px',
            borderRadius: 'var(--r-md)',
            background: '#FDEAEA',
            color: 'var(--status-red)',
            fontSize: 13,
          }}
        >
          {globalError}
        </div>
      )}

      {step === 1 && (
        <Step1Cabinet
          data={data}
          onUpdate={handleUpdate}
          onNext={async () => {
            try {
              await handleStep1Next();
            } catch (err) {
              setGlobalError(err instanceof Error ? err.message : 'Erreur de sauvegarde.');
              throw err;
            }
          }}
          onPrev={goPrev}
        />
      )}
      {step === 2 && (
        <Step2Inpi
          data={data}
          onUpdate={handleUpdate}
          onNext={async () => {
            try {
              await handleStep2Next();
            } catch (err) {
              setGlobalError(err instanceof Error ? err.message : 'Erreur de sauvegarde.');
              throw err;
            }
          }}
          onPrev={goPrev}
        />
      )}
      {step === 3 && (
        <Step3Team
          data={data}
          onUpdate={handleUpdate}
          onNext={async () => {
            try {
              await handleStep3Next();
            } catch (err) {
              setGlobalError(err instanceof Error ? err.message : 'Erreur de sauvegarde.');
              throw err;
            }
          }}
          onPrev={goPrev}
        />
      )}
      {step === 4 && (
        <Step4Plan
          data={data}
          onUpdate={handleUpdate}
          onNext={async () => {
            try {
              await handleStep4Finish();
            } catch (err) {
              setGlobalError(err instanceof Error ? err.message : 'Erreur de sauvegarde.');
              throw err;
            }
          }}
          onPrev={goPrev}
        />
      )}
    </div>
  );
}
