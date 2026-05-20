# Intégration Stripe — Setup

## Vue d'ensemble

Compta facture ses cabinets clients via Stripe Billing (abonnement mensuel récurrent).

```
Cabinet ─▶ /billing ─▶ Server Action ─▶ Stripe Checkout (hosted)
                                              │
                              webhook         ▼ paiement OK
              ◀──────────  Stripe  ──────────  
              │
              ▼
    /api/stripe/webhook ─▶ update organizations + insert invoices (Supabase)
```

- Les plans gérés via Stripe sont **Cabinet** (79 €/mois HT) et **Pro** (199 €/mois HT).
- Le plan **Enterprise** est hors-Stripe (devis manuel).
- Le webhook est la **seule source de vérité** pour mettre à jour `organizations.plan` et `organizations.stripe_subscription_id`. La page `/billing/success` ne fait JAMAIS confiance au query string.

## 1. Créer un compte Stripe

1. Inscription sur [dashboard.stripe.com](https://dashboard.stripe.com/register).
2. Activer le **mode test** (toggle en haut à droite) pendant le développement.
3. Récupérer les clés dans **Developers → API keys** :
   - `Publishable key` (commence par `pk_test_…`)
   - `Secret key` (commence par `sk_test_…`)

## 2. Créer les produits et les prix

Dashboard Stripe → **Products → Add product** :

### Produit 1 — Cabinet

| Champ                    | Valeur                  |
| ------------------------ | ----------------------- |
| Name                     | Compta — Cabinet        |
| Pricing model            | Recurring               |
| Price                    | 79.00 EUR               |
| Billing period           | Monthly                 |
| Tax behavior             | Exclusive (HT)          |

→ Copier le **Price ID** (`price_xxx`) dans `STRIPE_PRICE_CABINET`.

### Produit 2 — Cabinet Pro

| Champ                    | Valeur                  |
| ------------------------ | ----------------------- |
| Name                     | Compta — Cabinet Pro    |
| Pricing model            | Recurring               |
| Price                    | 199.00 EUR              |
| Billing period           | Monthly                 |
| Tax behavior             | Exclusive (HT)          |

→ Copier le **Price ID** dans `STRIPE_PRICE_PRO`.

## 3. Variables d'environnement

Ajouter dans `.env.local` (dev) et sur **Vercel → Project → Settings → Environment Variables** (prod) :

| Variable                              | Exemple                                    | Obligatoire ? | Scope    |
| ------------------------------------- | ------------------------------------------ | :-----------: | -------- |
| `STRIPE_SECRET_KEY`                   | `sk_test_51N…`                             |       ✓       | server   |
| `STRIPE_WEBHOOK_SECRET`               | `whsec_…`                                  |       ✓       | server   |
| `STRIPE_PRICE_CABINET`                | `price_1Q…`                                |       ✓       | server   |
| `STRIPE_PRICE_PRO`                    | `price_1Q…`                                |       ✓       | server   |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`  | `pk_test_51N…`                             |       ✓       | server + client |
| `NEXT_PUBLIC_APP_URL`                 | `https://app.compta.fr`                    |   recommandé  | server   |
| `SUPABASE_SERVICE_ROLE_KEY`           | `eyJ…` (service_role, **pas** anon)        |       ✓       | server   |

> **Sécurité** : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` et `SUPABASE_SERVICE_ROLE_KEY` sont des secrets serveur — ne JAMAIS les exposer côté client (ne pas préfixer par `NEXT_PUBLIC_`).

## 4. Webhook Stripe

Le webhook reçoit les events asynchrones de Stripe (paiement réussi/échoué, abonnement créé/modifié/annulé).

### En développement (local)

Installer la CLI Stripe : [stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli)

```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

→ La CLI affiche un secret `whsec_…` à mettre dans `STRIPE_WEBHOOK_SECRET` dans `.env.local`.

Pour déclencher un event de test :

```bash
stripe trigger checkout.session.completed
stripe trigger invoice.payment_succeeded
```

### En production (Vercel)

1. Dashboard Stripe → **Developers → Webhooks → Add endpoint**
2. URL : `https://app.compta.fr/api/stripe/webhook`
3. Events à écouter :
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copier le **Signing secret** (`whsec_…`) → variable `STRIPE_WEBHOOK_SECRET` sur Vercel
5. Redéployer pour propager la variable.

## 5. Customer Portal (Stripe-hosted)

Le bouton « Gérer mon abonnement » redirige vers le **Stripe Customer Portal**. Il faut le configurer une fois :

Dashboard Stripe → **Settings → Billing → Customer portal** :

- ✅ Allow customers to update payment methods
- ✅ Allow customers to update billing address
- ✅ Allow customers to view invoice history
- ✅ Allow customers to cancel subscriptions (au choix : « at end of period » recommandé)
- ✅ Allow customers to switch plans → cocher les 2 prices créés

## 6. Tests manuels

| Cas                                                            | Action                                                          | Résultat attendu                                                                                                                |
| -------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Souscription Cabinet                                           | `/billing` → bouton « Souscrire » sous Cabinet                  | Redirection Stripe Checkout, après paiement test (`4242 4242 4242 4242`), retour sur `/billing/success`                         |
| Webhook met à jour la DB                                       | Après checkout réussi                                           | `organizations.plan = 'cabinet'` et `stripe_subscription_id` set                                                                |
| Facture en DB                                                  | Stripe émet la 1re facture                                      | Une ligne dans `invoices` avec `direction='platform_to_cabinet'`, `status='paid'`                                               |
| Customer Portal                                                | `/billing` → bouton « Gérer mon abonnement »                    | Redirection vers le portail Stripe-hosted, retour sur `/billing`                                                                |
| Annulation                                                     | Portal → Cancel                                                 | Webhook `customer.subscription.updated` (cancel_at_period_end=true) → `/billing` affiche « Votre abonnement sera annulé le … » |
| Stripe non configuré                                           | `STRIPE_SECRET_KEY` absent                                       | `/billing` affiche un encart d'erreur clean, pas de crash                                                                       |

### Cartes de test Stripe

| Numéro                | Résultat                  |
| --------------------- | ------------------------- |
| `4242 4242 4242 4242` | Paiement OK               |
| `4000 0000 0000 0341` | Paiement décliné          |
| `4000 0025 0000 3155` | Demande 3D Secure         |

CVV : n'importe quoi. Date d'expiration : future.

## 7. Schéma DB requis (rappel)

Les colonnes utilisées existent déjà dans `supabase/schema-v3.sql` :

- `organizations.plan` (check : `'cabinet' | 'pro' | 'enterprise'`)
- `organizations.stripe_customer_id`
- `organizations.stripe_subscription_id`
- `invoices.direction = 'platform_to_cabinet'`
- `invoices.stripe_invoice_id`

## 8. Aller en production

1. Activer le mode **Live** dans Stripe (validation KYC requise).
2. Recréer les produits/prix en mode Live (les IDs sont différents).
3. Mettre à jour les variables d'environnement Vercel avec les clés `sk_live_…` / `pk_live_…` / nouveaux `price_…`.
4. Recréer le webhook endpoint en mode Live.
5. Vérifier que `NEXT_PUBLIC_APP_URL` pointe sur le domaine de prod.
