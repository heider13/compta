#!/usr/bin/env python3
"""Ingestion du corpus juridique → Supabase pgvector.

Sources :
  - EUR-Lex (droit UE) : API publique sans clé (SPARQL + HTML).
  - Légifrance PISTE : nécessite PISTE_CLIENT_ID / PISTE_CLIENT_SECRET
    (inscription gratuite sur piste.gouv.fr, API "Légifrance").

Usage (sur le VPS, venv actif, env chargé depuis /etc/compta-proxy.env) :
  python ingest.py eurlex CELEX:32013R0575        # un règlement UE
  python ingest.py legifrance LEGITEXT000005634379 --max-articles 500  # Code de commerce
  python ingest.py legifrance-article LEGIARTI000006222222

Chunking : ~1500 caractères (~350 tokens) avec chevauchement de 200 —
sous la limite de 512 tokens de Solon.
"""
import argparse
import html
import json
import os
import re
import sys
import urllib.request

EMBED_URL = os.environ.get("EMBED_SERVICE_URL", "http://127.0.0.1:8100")
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

CHUNK_SIZE, CHUNK_OVERLAP = 1500, 200


def http_json(url, payload=None, headers=None, method=None):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method or ("POST" if data else "GET"))
    req.add_header("Content-Type", "application/json")
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read())


def supa(path, payload=None, method=None):
    return http_json(
        f"{SUPABASE_URL}/rest/v1/{path}",
        payload,
        {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Prefer": "return=representation,resolution=merge-duplicates",
        },
        method,
    )


def chunk_text(text):
    text = re.sub(r"\s+", " ", text).strip()
    chunks, start = [], 0
    while start < len(text):
        end = start + CHUNK_SIZE
        # coupe à la fin de phrase la plus proche
        if end < len(text):
            dot = text.rfind(". ", start + CHUNK_SIZE // 2, end)
            if dot > 0:
                end = dot + 1
        chunks.append(text[start:end].strip())
        start = max(end - CHUNK_OVERLAP, start + 1)
    return [c for c in chunks if len(c) > 80]


def embed_passages(texts):
    out = []
    for i in range(0, len(texts), 32):
        r = http_json(f"{EMBED_URL}/embed", {"texts": texts[i:i + 32], "kind": "passage"})
        out.extend(r["embeddings"])
        print(f"  embeddings {min(i + 32, len(texts))}/{len(texts)}", flush=True)
    return out


def store(source, source_id, title, url, doc_type, date_version, text):
    chunks = chunk_text(text)
    if not chunks:
        print(f"  [skip] {source_id} : texte vide")
        return 0
    embs = embed_passages(chunks)
    doc = supa("legal_documents?on_conflict=source,source_id", {
        "source": source, "source_id": source_id, "title": title[:500],
        "url": url, "doc_type": doc_type, "date_version": date_version,
    })[0]
    # Remplace les chunks existants du document
    supa(f"legal_chunks?document_id=eq.{doc['id']}", method="DELETE")
    rows = [
        {"document_id": doc["id"], "chunk_index": i, "content": c, "embedding": e}
        for i, (c, e) in enumerate(zip(chunks, embs))
    ]
    for i in range(0, len(rows), 50):
        supa("legal_chunks", rows[i:i + 50])
    print(f"  [ok] {title[:70]} — {len(chunks)} chunks")
    return len(chunks)


def strip_html(raw):
    raw = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", raw, flags=re.S | re.I)
    raw = re.sub(r"<[^>]+>", " ", raw)
    return html.unescape(raw)


# ─── EUR-Lex (sans clé) ───────────────────────────────────────────
def ingest_eurlex(celex):
    celex_id = celex.replace("CELEX:", "")
    url = f"https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:{celex_id}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (ComptaBot)"})
    with urllib.request.urlopen(req, timeout=120) as r:
        page = r.read().decode("utf-8", "replace")
    m = re.search(r"<title>([^<]+)</title>", page)
    title = html.unescape(m.group(1)).strip() if m else celex_id
    text = strip_html(page)
    return store("eurlex", f"CELEX:{celex_id}", title,
                 f"https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:{celex_id}",
                 "acte_ue", None, text)


# ─── Légifrance via PISTE ─────────────────────────────────────────
def piste_token():
    cid, secret = os.environ.get("PISTE_CLIENT_ID"), os.environ.get("PISTE_CLIENT_SECRET")
    if not cid or not secret:
        sys.exit("PISTE_CLIENT_ID / PISTE_CLIENT_SECRET manquants — inscription sur piste.gouv.fr (API Légifrance).")
    body = f"grant_type=client_credentials&client_id={cid}&client_secret={secret}&scope=openid"
    req = urllib.request.Request(
        "https://oauth.piste.gouv.fr/api/oauth/token",
        data=body.encode(),
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())["access_token"]


def piste(path, payload, token):
    return http_json(
        f"https://api.piste.gouv.fr/dila/legifrance/lf-engine-app{path}",
        payload,
        {"Authorization": f"Bearer {token}"},
    )


def ingest_legifrance_article(article_id, token=None):
    token = token or piste_token()
    data = piste("/consult/getArticle", {"id": article_id}, token)
    art = data.get("article") or {}
    texte = strip_html(art.get("texteHtml") or art.get("texte") or "")
    num = art.get("num") or ""
    ctitle = (art.get("context") or {}).get("titreTxt") or ""
    title = f"Article {num} — {ctitle}".strip(" —")
    return store("legifrance", article_id, title,
                 f"https://www.legifrance.gouv.fr/codes/article_lc/{article_id}",
                 "code_article", art.get("dateDebut"), texte)


def ingest_legifrance_code(textid, max_articles, token=None):
    token = token or piste_token()
    toc = piste("/consult/legi/tableMatieres",
                {"textId": textid, "nature": "CODE", "date": None}, token)

    ids = []
    def walk(node):
        for a in node.get("articles") or []:
            if a.get("id"):
                ids.append(a["id"])
        for s in node.get("sections") or []:
            walk(s)
    walk(toc)

    print(f"{len(ids)} articles trouvés, ingestion de {min(len(ids), max_articles)}")
    total = 0
    for i, aid in enumerate(ids[:max_articles]):
        try:
            total += ingest_legifrance_article(aid, token)
        except Exception as e:  # noqa: BLE001
            print(f"  [err] {aid}: {e}")
        if (i + 1) % 25 == 0:
            print(f"  … {i + 1}/{min(len(ids), max_articles)}")
    print(f"Terminé : {total} chunks au total")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("mode", choices=["eurlex", "legifrance", "legifrance-article"])
    p.add_argument("identifier")
    p.add_argument("--max-articles", type=int, default=300)
    args = p.parse_args()
    if args.mode == "eurlex":
        ingest_eurlex(args.identifier)
    elif args.mode == "legifrance-article":
        ingest_legifrance_article(args.identifier)
    else:
        ingest_legifrance_code(args.identifier, args.max_articles)
