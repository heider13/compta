-- Comptes « entrepreneur » (achat d'une formalité depuis la page Indépendants et TPE) :
-- profil seulement, pas de cabinet créé automatiquement.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _org_id uuid;
  _first text;
  _last text;
  _email text;
  _slug text;
begin
  _first := new.raw_user_meta_data->>'first_name';
  _last := new.raw_user_meta_data->>'last_name';
  _email := new.email;

  -- Insère le profile
  insert into public.profiles (id, first_name, last_name)
  values (new.id, _first, _last)
  on conflict (id) do nothing;

  -- Compte entrepreneur : aucun cabinet (il n'accède qu'à son espace /espace)
  if (new.raw_user_meta_data->>'compte') = 'entrepreneur' then
    return new;
  end if;

  -- Si une invitation a été utilisée, le membership sera créé séparément
  -- Sinon : crée un cabinet par défaut "<Prénom> Cabinet" et l'user devient owner
  if (new.raw_user_meta_data->>'invitation_token') is null then
    _slug := lower(regexp_replace(
      coalesce(_first, _email, 'cabinet') || '-' || substring(new.id::text, 1, 6),
      '[^a-z0-9]+', '-', 'g'
    ));

    insert into public.organizations (name, slug, contact_email)
    values (
      coalesce(nullif(trim(_first || ' ' || coalesce(_last, '')), ''), 'Cabinet') || ' — Cabinet',
      _slug,
      _email
    )
    returning id into _org_id;

    insert into public.memberships (user_id, organization_id, role)
    values (new.id, _org_id, 'owner');
  end if;

  return new;
end; $function$;
