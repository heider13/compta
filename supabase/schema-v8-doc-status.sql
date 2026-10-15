-- Statuts de documents : GENERE (acte rédigé, non signé) et SIGNE (version signée).
alter type public.doc_status add value if not exists 'GENERE';
alter type public.doc_status add value if not exists 'SIGNE';
