# Publication des annonces légales — Les Echos Le Parisien Services

L'agent rédige l'annonce (mentions obligatoires contrôlées). Le cabinet la **commande** depuis
le panneau du dossier, étape « Annonce légale », bouton **« Publier l'annonce »** :

1. choix du type d'annonce (proposé automatiquement) et du département ;
2. tarifs de chaque journal habilité : prix TTC, date de parution, en ligne ou papier ;
3. commande confirmée (le tarif est revérifié juste avant ; une `Idempotency-Key` empêche
   toute double commande) ;
4. suivi automatique : `pending` → `review` → `validated` → `published` ;
5. l'**attestation de parution** (document `certificate`) est copiée dans le dossier, puis
   versée au Guichet unique avec le bouton existant ; le **justificatif** de parution
   (`publicationProofUrl`) s'affiche dès qu'il existe.

La commande est facturée : elle n'est **jamais** déclenchée par l'agent. Une annonce qui contient
encore des « [À COMPLÉTER] » est refusée avant l'envoi au journal.

Limite contractuelle (e-mail du commercial, 28/10/2026) : l'API ne facture pas le client final,
et uniquement sur facture. Les annonces sont facturées au compte Legaly, qui refacture.

## Variables d'environnement (VPS, `/etc/compta-proxy.env`)

| Variable               | Valeur                                                     | Obligatoire |
| ---------------------- | ---------------------------------------------------------- | :---------: |
| `LELPS_API_KEY`        | clé API (une par environnement, fournie par leur support)  |      ✓      |
| `LELPS_API_URL`        | défaut préproduction `https://api-preprod.lesechosleparisienservices.fr/v1` ; production `https://api.lesechosleparisienservices.fr/v1` | |
| `LELPS_WEBHOOK_SECRET` | clé de signature des webhooks (fournie par leur support)   |             |

Ajout de la clé sans passer par un fichier (presse-papiers → serveur), depuis PowerShell :

```
(Get-Clipboard -Raw).Trim() | ssh -i $HOME\.ssh\compta_vps root@217.160.143.183 lelps-cle
```

## Webhook (facultatif : sans lui, le panneau relit l'annonce à chaque rafraîchissement)

- URL : `https://0dao73k.cserverhost.cloud/api/annonces/webhook`
- Événement utile : `legal_notice_publication_proof_created`
- Configuration : `PUT /v1/webhook` (exige le produit `formality` sur le compte) ; la clé de
  signature est demandée au support, puis mise dans `LELPS_WEBHOOK_SECRET`.
- Vérification : en-tête `X-Signature: t=…,s=…` (HMAC-SHA256 hex du corps brut, ±5 min).
- En préproduction, les messages partent toutes les 15 minutes (3 en production).

## Préproduction

- Données de test uniquement (sociétés fictives) : pas de données personnelles réelles.
- Justificatif numérique disponible seulement pour « Les Echos.fr (Web) » et
  « Le Parisien.fr (Web) ».
- Le panneau affiche « Environnement de test : rien n'est publié ni facturé ».

## Passage en production (go-live)

1. Clé API de production + produits `legal_notice` (et `newspaper` si besoin) activés.
2. `LELPS_API_URL=https://api.lesechosleparisienservices.fr/v1`, nouvelle `LELPS_API_KEY`.
3. Webhook de production avec sa propre clé de signature.

## Support technique

N'Tech : support-ntech@lesechosleparisien.fr — portail
https://groupelesechosleparisien.atlassian.net/servicedesk/customer/portal/1
(donner le `request_id` des erreurs, jamais la clé API).

## Test hors ligne

```
cd server && node tests/test-annonces-lelps.js
```
