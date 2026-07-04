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


# ─── Jurisprudence Conseil d'État (fonds CETAT via PISTE) ─────────
def ingest_jurisprudence_ce(query, max_results, token=None):
    """Recherche de décisions du Conseil d'État sur un thème de contentieux
    fiscal et ingestion de leur texte intégral (fonds CETAT)."""
    token = token or piste_token()
    payload = {
        "recherche": {
            "champs": [{
                "typeChamp": "ALL",
                "criteres": [{"typeRecherche": "UN_DES_MOTS", "valeur": query, "operateur": "ET"}],
                "operateur": "ET",
            }],
            "filtres": [{"facette": "JURIDICTION", "valeurs": ["CONSEIL_ETAT"]}],
            "pageNumber": 1, "pageSize": min(max_results, 50),
            "sort": "PERTINENCE", "typePagination": "DEFAUT",
        },
        "fond": "CETAT",
    }
    res = piste("/search", payload, token)
    results = res.get("results") or []
    print(f"{len(results)} décisions trouvées pour « {query} »")
    total = 0
    for r in results[:max_results]:
        cid = r.get("id") or (r.get("titles") or [{}])[0].get("id")
        if not cid:
            continue
        try:
            data = piste("/consult/juri", {"textId": cid}, token)
            txt = strip_html((data.get("text") or {}).get("texteHtml") or (data.get("text") or {}).get("texte") or "")
            meta = data.get("text") or {}
            num = meta.get("num") or meta.get("numero") or cid[:12]
            date = meta.get("dateTexte") or meta.get("datePubli")
            title = f"CE, {num}" + (f", {date}" if date else "")
            total += store("jurisprudence_ce", cid, title,
                           f"https://www.legifrance.gouv.fr/ceta/id/{cid}",
                           "jurisprudence", date, txt)
        except Exception as e:  # noqa: BLE001
            print(f"  [err] {cid}: {e}")
    print(f"Terminé : {total} chunks")


# ─── BOFiP (open data DGFiP, sans clé) ────────────────────────────
def ingest_bofip(boi_id):
    """Ingère un document BOFiP par son identifiant BOI (ex : BOI-TVA-DECLA-20-30-10)."""
    url = f"https://bofip.impots.gouv.fr/bofip/{boi_id.replace('BOI-', '').replace('-', '/')}/BOFIP.html"
    # Fallback sur la page HTML publique
    page_url = f"https://bofip.impots.gouv.fr/bofip/ext/{boi_id}"
    req = urllib.request.Request(page_url, headers={"User-Agent": "Mozilla/5.0 (ComptaBot)"})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            page = r.read().decode("utf-8", "replace")
    except Exception as e:  # noqa: BLE001
        print(f"  [err] BOFiP {boi_id} inaccessible: {e}")
        return 0
    m = re.search(r"<title>([^<]+)</title>", page)
    title = html.unescape(m.group(1)).strip() if m else boi_id
    text = strip_html(page)
    return store("bofip", boi_id, f"{title} ({boi_id})", page_url, "doctrine_fiscale", None, text)


# ─── PDF (PCG, bulletins CNCC — upload manuel ou URL) ─────────────
def ingest_pdf(source, source_id, title, path_or_url, doc_type="reglement", url=None):
    """Extrait le texte d'un PDF (fichier local ou URL) et l'indexe.
    Nécessite pypdf dans le venv."""
    from pypdf import PdfReader
    import io

    if path_or_url.startswith("http"):
        req = urllib.request.Request(path_or_url, headers={"User-Agent": "Mozilla/5.0 (ComptaBot)"})
        with urllib.request.urlopen(req, timeout=300) as r:
            raw = r.read()
        reader = PdfReader(io.BytesIO(raw))
    else:
        reader = PdfReader(path_or_url)
    text = "\n".join((pg.extract_text() or "") for pg in reader.pages)
    return store(source, source_id, title, url or path_or_url, doc_type, None, text)


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("mode", choices=[
        "eurlex", "legifrance", "legifrance-article",
        "jurisprudence-ce", "bofip", "pdf",
    ])
    p.add_argument("identifier", nargs="?")
    p.add_argument("--max-articles", type=int, default=300)
    p.add_argument("--max-results", type=int, default=30)
    # options mode pdf
    p.add_argument("--source"); p.add_argument("--source-id")
    p.add_argument("--title"); p.add_argument("--path"); p.add_argument("--url")
    args = p.parse_args()

    if args.mode == "eurlex":
        ingest_eurlex(args.identifier)
    elif args.mode == "legifrance-article":
        ingest_legifrance_article(args.identifier)
    elif args.mode == "legifrance":
        ingest_legifrance_code(args.identifier, args.max_articles)
    elif args.mode == "jurisprudence-ce":
        ingest_jurisprudence_ce(args.identifier, args.max_results)
    elif args.mode == "bofip":
        ingest_bofip(args.identifier)
    elif args.mode == "pdf":
        ingest_pdf(args.source, args.source_id, args.title, args.path, url=args.url)
