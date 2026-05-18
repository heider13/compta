# Compta INPI Proxy

Petit serveur Express qui proxy les appels au Guichet Unique INPI depuis une **IP française fixe** (VPS OVH), parce que les IPs Vercel sont filtrées par le WAF de l'INPI.

## Architecture

```
Browser (HTTPS) ─JWT Supabase─▶ Vercel (frontend)
                                       │
                                       ▼ fetch HTTPS
                  https://vps-84ac2579.vps.ovh.net/api/*
                                       │
                                       ▼  Caddy (TLS) → 127.0.0.1:3000 (Node)
                                       │
                                       ▼ Bearer ou Cookie BEARER
                            https://guichet-unique.inpi.fr
```

## Variables d'environnement (`/etc/compta-proxy.env`)

| Variable                      | Valeur                                                          |
| ----------------------------- | --------------------------------------------------------------- |
| `INPI_BASE_URL`               | `https://guichet-unique.inpi.fr`                                |
| `INPI_USERNAME`               | login e-procédures INPI (mandataire)                            |
| `INPI_PASSWORD`               | password e-procédures                                           |
| `SUPABASE_URL`                | `https://dzdmwthtcmqkyalkbhbw.supabase.co`                      |
| `SUPABASE_SERVICE_ROLE_KEY`   | service_role key                                                |
| `CORS_ALLOWED_ORIGINS`        | origines autorisées (csv), `*.vercel.app` est wildcardé en plus |

## Setup du VPS (depuis chez toi)

```bash
ssh ubuntu@51.210.247.134
# Puis sur le VPS :
git clone https://github.com/heider13/compta.git /tmp/compta
sudo bash /tmp/compta/server/setup.sh
sudo nano /etc/compta-proxy.env   # remplir les valeurs
sudo systemctl restart compta-proxy caddy
curl https://vps-84ac2579.vps.ovh.net/health
```

## Endpoints

Tous protégés par JWT Supabase (header `Authorization: Bearer <jwt>`).

| Méthode | Route                                | Description                       |
| ------- | ------------------------------------ | --------------------------------- |
| GET     | `/health`                            | Sans auth — santé                 |
| GET     | `/api/inpi-status`                   | Test la chaîne INPI               |
| GET     | `/api/formalites`                    | Liste paginée                     |
| POST    | `/api/formalites`                    | Crée formalité auto-entrepreneur  |
| GET     | `/api/formalites/:id`                | Détail                            |
| PUT     | `/api/formalites/:id`                | Update                            |
| DELETE  | `/api/formalites/:id`                | Suppression brouillon             |
| POST    | `/api/formalites/:id/sign`           | Signature                         |
| GET/POST| `/api/formalites/:id/attachments`    | Liste / ajoute pièces             |
| GET     | `/api/formalites/:id/synthesis`      | PDF de synthèse                   |

## Mise à jour du code

```bash
ssh ubuntu@51.210.247.134
sudo bash /opt/compta-proxy/server/setup.sh   # idempotent : git pull + npm i
sudo systemctl restart compta-proxy
```
