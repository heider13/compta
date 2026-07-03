'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type {
  OnboardingData,
  OrganizationForOnboarding,
  OrgPlan,
  PendingInvitation,
} from '@/lib/types/onboarding';
import { Card, CardContent } from '@/components/ui/card';
import { ProgressBar } from './ProgressBar';
import { Step1Cabinet } from './Step1Cabinet';
import { Step3Team } from './Step3Team';
import { Step4Plan } from './Step4Plan';

type Props = {
  org: OrganizationForOnboarding;
  userId: string;
};

const STEPS = ['Cabinet', 'Équipe', 'Plan'];

function normalizePlan(plan: string | null): OrgPlan {
  if (plan === 'pro' || plan === 'enterprise' || plan === 'cabinet') return plan;
  return 'cabinet';
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
    invitations: readInvitations(org.white_label_config),
    plan: normalizePlan(org.plan),
  });

  const handleUpdate = useCallback((patch: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...patch }));
  }, []);

  const persistPartial = useCallback(
    async (patch: Partial<OnboardingData>): Promise<void> => {
      const update: Record<string, unknown> = {};

      if (patch.cabinetName !== undefined) update.name = patch.cabinetName.trim();
      if (patch.siren !== undefined) update.siren = patch.siren.replace(/\s+/g, '');
      if (patch.contactEmail !== undefined)
        update.contact_email = patch.contactEmail.trim() || null;
      if (patch.contactPhone !== undefined)
        update.contact_phone = patch.contactPhone.trim() || null;
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
    await persistInvitations(data.invitations);
    setStep(3);
  }, [data.invitations, persistInvitations]);

  const handleStep3Finish = useCallback(async () => {
    await persistPartial({ plan: data.plan });
    router.push('/dashboard');
    router.refresh();
  }, [data.plan, persistPartial, router]);

  return (
    <Card className="shadow-lg">
      <CardContent className="p-6 sm:p-8">
        <ProgressBar steps={STEPS} current={step} />

        {globalError && (
          <div
            role="alert"
            className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
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
          <Step3Team
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
          <Step4Plan
            data={data}
            onUpdate={handleUpdate}
            onNext={async () => {
              try {
                await handleStep3Finish();
              } catch (err) {
                setGlobalError(err instanceof Error ? err.message : 'Erreur de sauvegarde.');
                throw err;
              }
            }}
            onPrev={goPrev}
          />
        )}
      </CardContent>
    </Card>
  );
}
