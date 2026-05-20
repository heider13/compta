// Types pour le flow d'onboarding cabinet (B2B SaaS Compta)
// Ces données sont collectées par le wizard et persistées dans la table `organizations`.

export type InvitationRole = 'admin' | 'collaborator' | 'readonly';

export type OrgPlan = 'cabinet' | 'pro' | 'enterprise';

export type PendingInvitation = {
  email: string;
  role: InvitationRole;
};

export type OnboardingData = {
  // Étape 1 — Cabinet
  cabinetName: string;
  siren: string;
  contactEmail: string;
  contactPhone: string;
  // Étape 2 — Équipe (invitations en attente, non encore envoyées)
  invitations: PendingInvitation[];
  // Étape 3 — Plan
  plan: OrgPlan;
};

// Shape minimale de la ligne `organizations` chargée côté serveur
// pour pré-remplir le wizard.
export type OrganizationForOnboarding = {
  id: string;
  name: string;
  siren: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  inpi_username: string | null;
  inpi_password_encrypted: string | null;
  inpi_env: string | null;
  plan: string | null;
  white_label_config: Record<string, unknown> | null;
};
