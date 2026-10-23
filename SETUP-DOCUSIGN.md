# Intégration DocuSign — Setup

DocuSign remplace Yousign pour la signature électronique : actes signés par le client
(envoi par e-mail) et synthèse de la formalité signée par le formaliste (signature
intégrée, ouverte depuis le dossier). Le code Yousign reste en place : les demandes déjà
ouvertes chez Yousign se terminent normalement, et `SIGNATURE_PROVIDER=yousign` permet
de revenir en arrière sans déploiement.

## Choix du fournisseur

| `SIGNATURE_PROVIDER` | Effet                                                          |
| -------------------- | -------------------------------------------------------------- |
| *(vide)*             | DocuSign dès que ses variables sont présentes, sinon Yousign   |
| `docusign`           | DocuSign                                                       |
| `yousign`            | Yousign                                                        |

Chaque demande garde son fournisseur (`fournisseur` dans les métadonnées du parcours).

## 1. Côté compte développeur DocuSign (environnement « demo »)

Dans **Settings → Apps and Keys** (https://admindemo.docusign.com) :

1. **Add App and Integration Key** → nommer l'application « Legaly AI ».
2. Noter l'**Integration Key** (= `DOCUSIGN_INTEGRATION_KEY`).
3. Section **Service Integration** → **Generate RSA** : copier la **clé privée**
   (elle n'est affichée qu'une fois) dans un fichier sur le serveur.
4. Section **Additional settings → Redirect URIs** : ajouter
   `https://compta-navy.vercel.app/signature-terminee`.
5. En haut de la page **Apps and Keys** : noter le **User ID** (GUID,
   = `DOCUSIGN_USER_ID`) et l'**API Account ID** (= `DOCUSIGN_ACCOUNT_ID`).

## 2. Variables d'environnement (VPS, `/etc/compta-proxy.env`)

| Variable                      | Exemple / valeur                                         | Obligatoire |
| ----------------------------- | -------------------------------------------------------- | :---------: |
| `DOCUSIGN_INTEGRATION_KEY`    | GUID de l'application                                    |      ✓      |
| `DOCUSIGN_USER_ID`            | GUID de l'utilisateur qui envoie les enveloppes          |      ✓      |
| `DOCUSIGN_PRIVATE_KEY_PATH`   | `/etc/compta-proxy/docusign.pem` (chmod 600)             |      ✓      |
| `DOCUSIGN_ACCOUNT_ID`         | API Account ID (sinon compte par défaut)                 |             |
| `DOCUSIGN_ENV`                | `demo` (défaut) ou `prod`                                |             |
| `DOCUSIGN_CONNECT_SECRET`     | clé HMAC de Connect (étape 4)                            |      ✓      |
| `DOCUSIGN_RETURN_URL`         | `https://compta-navy.vercel.app/signature-terminee`      |             |
| `DOCUSIGN_SIGNATURE_PROVIDER` | fournisseur de signature qualifiée QES (étape 5)          |             |
| `DOCUSIGN_IDV_WORKFLOW_ID`    | vérification d'identité imposée (étape 5)                |             |

`DOCUSIGN_PRIVATE_KEY` (contenu PEM, `\n` échappés) peut remplacer le chemin du fichier.
Puis `systemctl restart compta-proxy`.

## 3. Consentement (une seule fois)

L'application agit au nom de l'utilisateur (JWT Grant) : il doit l'autoriser une fois.
Ouvrir, connecté au compte DocuSign demo :

```
https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=<DOCUSIGN_INTEGRATION_KEY>&redirect_uri=https://compta-navy.vercel.app/signature-terminee
```

Cliquer **Accepter**. Sans cette étape, le serveur répond `docusign_consent_required`.
En production, même URL avec `account.docusign.com`.

## 4. Webhook (DocuSign Connect)

**Settings → Connect → Add Configuration → Custom** :

- **URL** : `https://vps-84ac2579.vps.ovh.net/api/docusign/webhook`
- **Data format** : JSON (« REST v2.1 », SIM)
- **Événements** : *Envelope Completed*, *Envelope Declined*, *Envelope Voided*
  (et *Recipient Declined*)
- **Include HMAC Signature** : activé. **Connect Keys → Add Secret Key** : copier la
  clé dans `DOCUSIGN_CONNECT_SECRET`.

Tout appel sans HMAC valide (`X-DocuSign-Signature-1`) est rejeté (401). Sans webhook,
le panneau du dossier relit quand même le statut de l'enveloppe à chaque rafraîchissement.

## 5. Signature qualifiée (QES) pour les formalités INPI

Offre envisagée avec DocuSign (licence ISV) : enveloppes **standard** pour les actes signés
par le client, et **signatures qualifiées (QES)** avec **ID Verification Premier** pour la
signature de la formalité destinée au Guichet unique (pièce d'identité, selfie vidéo et
mouvements guidés sur mobile, puis signature qualifiée).

Dans le code, les options QES ne s'appliquent qu'à la signature de la formalité
(`signerFormalite`) ; les actes du client partent en enveloppe standard.

- **Vérification d'identité** : workflow « ID Verification » du compte, choisi
  automatiquement (« Premier » de préférence), ou imposé par `DOCUSIGN_IDV_WORKFLOW_ID`.
- **Fournisseur QES** : `DOCUSIGN_SIGNATURE_PROVIDER` (nom technique donné par le compte).

Une fois les clés en place, lister ce que le compte propose (lecture seule) :

```
cd /opt/compta-proxy/server && set -a && . /etc/compta-proxy.env && set +a && node tests/docusign-diagnostic.js
```

Rappel : le Guichet unique exige au moins une signature **avancée** pour les
modifications, cessations et dépôts de comptes ; la QES va au-delà et convient.

Autres différences avec Yousign :

- Pas de code par SMS ou e-mail par défaut (option payante « SMS Authentication »).
- Le lien de signature intégrée expire en quelques minutes : le bouton « Ouvrir la
  signature DocuSign » du dossier en demande un nouveau à chaque clic.
- L'environnement demo n'a pas de valeur juridique : passage en production après la
  revue « Go-Live » de DocuSign et un abonnement API.

## Test hors ligne

```
cd server && node tests/test-docusign.js
```

Simule DocuSign (jeton JWT, enveloppe, documents, signataire, envoi, lien, statuts).
