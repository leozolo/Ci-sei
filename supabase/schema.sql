-- =====================================================================
--  CLUB DEI CLUBBERS — database Supabase
--  Come usarlo: Supabase → SQL Editor → New query → incolla tutto → Run.
--  Lo script si può rieseguire senza perdere dati.
-- =====================================================================

-- ---------------------------------------------------------------------
--  TABELLE
-- ---------------------------------------------------------------------

-- Membri del gruppo (un profilo esiste solo per chi è entrato con un invito)
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text not null check (char_length(btrim(display_name)) between 1 and 40),
  avatar_url    text check (avatar_url is null or char_length(avatar_url) <= 1000),
  role          text not null default 'member' check (role in ('admin', 'member')),
  status        text not null default 'active' check (status in ('active', 'removed')),
  notify_prefs  jsonb not null default '{}'::jsonb,
  invited_by    uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Link d'invito creati dagli amministratori
create table if not exists public.invites (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  created_by  uuid default auth.uid() references public.profiles (id) on delete set null,
  max_uses    int  not null default 1 check (max_uses between 1 and 200),
  uses        int  not null default 0 check (uses >= 0),
  expires_at  timestamptz,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now()
);

-- Eventi
create table if not exists public.events (
  id             uuid primary key default gen_random_uuid(),
  created_by     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title          text not null check (char_length(btrim(title)) between 1 and 120),
  description    text check (description is null or char_length(description) <= 4000),
  category       text not null default 'altro' check (category in
                   ('discoteca','techno','concerto','aperitivo','festival','mostra','ristorante','cultura','sport','altro')),
  starts_at      timestamptz not null,
  ends_at        timestamptz,
  effective_end  timestamptz,           -- calcolata: fine evento o inizio + 6 ore
  city           text not null default 'Roma' check (char_length(btrim(city)) between 1 and 60),
  location_name  text check (location_name is null or char_length(location_name) <= 200),
  address        text check (address is null or char_length(address) <= 300),
  external_url   text check (external_url is null or (char_length(external_url) <= 2000 and external_url ~* '^https?://')),
  image_path     text check (image_path is null or char_length(image_path) <= 500),
  is_cancelled   boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint events_end_after_start check (ends_at is null or ends_at > starts_at)
);
-- installazioni precedenti: aggiunge la città senza toccare i dati
alter table public.events add column if not exists city text not null default 'Roma';
create index if not exists events_starts_at_idx      on public.events (starts_at);
create index if not exists events_effective_end_idx  on public.events (effective_end);
create index if not exists events_created_by_idx     on public.events (created_by);
create index if not exists events_city_idx           on public.events (city, starts_at);

-- Partecipazioni: Partecipo / Forse / Non partecipo (+ eventuali ospiti)
create table if not exists public.rsvps (
  event_id    uuid not null references public.events (id) on delete cascade,
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  status      text not null check (status in ('going', 'maybe', 'not_going')),
  guests      int  not null default 0 check (guests between 0 and 10),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index if not exists rsvps_user_idx on public.rsvps (user_id);

-- Commenti (con risposte)
create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  parent_id   uuid references public.comments (id) on delete cascade,
  body        text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at  timestamptz not null default now(),
  edited_at   timestamptz
);
create index if not exists comments_event_idx  on public.comments (event_id, created_at);
create index if not exists comments_parent_idx on public.comments (parent_id);

-- Like agli eventi
create table if not exists public.event_likes (
  event_id    uuid not null references public.events (id) on delete cascade,
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index if not exists event_likes_user_idx on public.event_likes (user_id);

-- Eventi salvati (preferiti, privati per ciascun utente)
create table if not exists public.saved_events (
  event_id    uuid not null references public.events (id) on delete cascade,
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index if not exists saved_events_user_idx on public.saved_events (user_id);

-- Notifiche in-app (create automaticamente dai trigger più sotto)
create table if not exists public.notifications (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  actor_id    uuid references public.profiles (id) on delete set null,
  type        text not null check (type in
                ('new_event','event_updated','event_cancelled','new_comment','comment_reply','friend_going')),
  event_id    uuid references public.events (id) on delete cascade,
  comment_id  uuid references public.comments (id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  read_at     timestamptz,
  pushed_at   timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists notifications_user_idx    on public.notifications (user_id, created_at desc);
create index if not exists notifications_pending_idx on public.notifications (created_at) where pushed_at is null;

-- Dispositivi iscritti alle notifiche push
create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- Segreti dell'app (chiavi per le notifiche push). Accessibile solo dal server.
create table if not exists public.app_secrets (
  key         text primary key,
  value       text not null,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
--  FUNZIONI DI SUPPORTO
-- ---------------------------------------------------------------------

create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and status = 'active'
  );
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and status = 'active' and role = 'admin'
  );
$$;

-- Preferenza di notifica: attiva salvo esplicito "false"
create or replace function public.wants(prefs jsonb, pref_key text) returns boolean
language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(prefs -> pref_key) = 'boolean'
              then (prefs -> pref_key)::boolean else true end;
$$;

-- Il gruppo ha già almeno un membro? (serve alla prima configurazione)
create or replace function public.group_has_members() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles);
$$;

-- Informazioni pubbliche su un invito (valido o no, chi l'ha creato)
create or replace function public.get_invite_info(p_code text) returns json
language plpgsql stable security definer set search_path = '' as $$
declare
  v_invite public.invites;
  v_name   text;
begin
  select * into v_invite from public.invites where code = lower(btrim(p_code));
  if not found then
    return json_build_object('valid', false, 'reason', 'not_found');
  elsif v_invite.revoked_at is not null then
    return json_build_object('valid', false, 'reason', 'revoked');
  elsif v_invite.expires_at is not null and v_invite.expires_at < now() then
    return json_build_object('valid', false, 'reason', 'expired');
  elsif v_invite.uses >= v_invite.max_uses then
    return json_build_object('valid', false, 'reason', 'used');
  end if;
  select display_name into v_name from public.profiles where id = v_invite.created_by;
  return json_build_object('valid', true, 'inviter', v_name);
end;
$$;

-- Entra nel gruppo. Il primissimo utente diventa amministratore,
-- tutti gli altri devono avere un codice d'invito valido.
create or replace function public.join_group(p_code text default null, p_display_name text default null)
returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare
  v_uid     uuid := (select auth.uid());
  v_profile public.profiles;
  v_invite  public.invites;
  v_meta    jsonb;
  v_name    text;
  v_avatar  text;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if found then
    if v_profile.status = 'active' then
      return v_profile;
    end if;
    raise exception 'removed' using errcode = '42501';
  end if;

  select coalesce(raw_user_meta_data, '{}'::jsonb) into v_meta from auth.users where id = v_uid;
  v_name := coalesce(
    nullif(btrim(p_display_name), ''),
    nullif(btrim(v_meta ->> 'display_name'), ''),
    nullif(btrim(v_meta ->> 'full_name'), ''),
    nullif(btrim(v_meta ->> 'name'), ''),
    'Amico'
  );
  v_name   := left(v_name, 40);
  v_avatar := coalesce(v_meta ->> 'avatar_url', v_meta ->> 'picture');

  -- evita che due persone diventino "primo amministratore" in contemporanea
  perform pg_advisory_xact_lock(hashtext('ci_sei_join_group'));

  if not exists (select 1 from public.profiles) then
    insert into public.profiles (id, display_name, avatar_url, role)
    values (v_uid, v_name, v_avatar, 'admin')
    returning * into v_profile;
    return v_profile;
  end if;

  if p_code is null or btrim(p_code) = '' then
    raise exception 'invite_required' using errcode = '42501';
  end if;

  select * into v_invite from public.invites where code = lower(btrim(p_code)) for update;
  if not found
     or v_invite.revoked_at is not null
     or (v_invite.expires_at is not null and v_invite.expires_at < now())
     or v_invite.uses >= v_invite.max_uses then
    raise exception 'invalid_invite' using errcode = '42501';
  end if;

  update public.invites set uses = uses + 1 where id = v_invite.id;

  insert into public.profiles (id, display_name, avatar_url, role, invited_by)
  values (v_uid, v_name, v_avatar, 'member', v_invite.created_by)
  returning * into v_profile;
  return v_profile;
end;
$$;

-- Elenco membri con email (solo per amministratori)
create or replace function public.admin_list_members()
returns table (
  id uuid, display_name text, avatar_url text, role text, status text,
  created_at timestamptz, invited_by uuid, email text, last_sign_in_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select p.id, p.display_name, p.avatar_url, p.role, p.status,
         p.created_at, p.invited_by, u.email::text, u.last_sign_in_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where public.is_admin()
  order by p.status, lower(p.display_name);
$$;

-- Registra il dispositivo per le notifiche push
create or replace function public.save_push_subscription(
  p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_member() then
    raise exception 'not_member' using errcode = '42501';
  end if;
  if p_endpoint !~* '^https://' or char_length(p_endpoint) > 2000 then
    raise exception 'invalid_endpoint' using errcode = '22023';
  end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values ((select auth.uid()), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
        user_agent = excluded.user_agent, created_at = now();
end;
$$;

-- Prende in carico le notifiche ancora da inviare come push (solo server)
create or replace function public.claim_pending_push(p_limit int default 200)
returns setof public.notifications
language sql security definer set search_path = '' as $$
  update public.notifications n
     set pushed_at = now()
   where n.id in (
     select id from public.notifications
      where pushed_at is null and created_at > now() - interval '2 hours'
      order by id
      limit greatest(1, least(p_limit, 500))
      for update skip locked
   )
  returning n.*;
$$;

-- ---------------------------------------------------------------------
--  TRIGGER: coerenza dei dati
-- ---------------------------------------------------------------------

create or replace function public.events_before_write() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  new.updated_at    := now();
  new.effective_end := coalesce(new.ends_at, new.starts_at + interval '6 hours');
  return new;
end;
$$;
drop trigger if exists events_before_write on public.events;
create trigger events_before_write before insert or update on public.events
  for each row execute function public.events_before_write();

create or replace function public.rsvps_before_write() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    new.event_id   := old.event_id;
    new.user_id    := old.user_id;
    new.created_at := old.created_at;
  end if;
  if new.status <> 'going' then
    new.guests := 0;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists rsvps_before_write on public.rsvps;
create trigger rsvps_before_write before insert or update on public.rsvps
  for each row execute function public.rsvps_before_write();

create or replace function public.comments_before_write() returns trigger
language plpgsql set search_path = '' as $$
declare v_parent_event uuid;
begin
  if tg_op = 'UPDATE' then
    new.event_id   := old.event_id;
    new.user_id    := old.user_id;
    new.parent_id  := old.parent_id;
    new.created_at := old.created_at;
    if new.body is distinct from old.body then
      new.edited_at := now();
    end if;
  elsif new.parent_id is not null then
    select event_id into v_parent_event from public.comments where id = new.parent_id;
    if v_parent_event is distinct from new.event_id then
      raise exception 'La risposta deve riferirsi allo stesso evento' using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists comments_before_write on public.comments;
create trigger comments_before_write before insert or update on public.comments
  for each row execute function public.comments_before_write();

-- Ruolo e stato dei membri: solo gli amministratori; mai senza almeno un admin
create or replace function public.profiles_before_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.id         := old.id;
  new.created_at := old.created_at;
  new.invited_by := old.invited_by;
  if new.role is distinct from old.role or new.status is distinct from old.status then
    if (select auth.uid()) is not null and not public.is_admin() then
      raise exception 'Solo un amministratore può cambiare ruolo o stato di un membro' using errcode = '42501';
    end if;
    if old.role = 'admin' and old.status = 'active'
       and (new.role <> 'admin' or new.status <> 'active')
       and not exists (
         select 1 from public.profiles p
         where p.role = 'admin' and p.status = 'active' and p.id <> old.id
       ) then
      raise exception 'Il gruppo deve avere almeno un amministratore' using errcode = '42501';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists profiles_before_update on public.profiles;
create trigger profiles_before_update before update on public.profiles
  for each row execute function public.profiles_before_update();

-- ---------------------------------------------------------------------
--  TRIGGER: notifiche
-- ---------------------------------------------------------------------

-- Nuovo evento → tutti i membri
create or replace function public.notify_new_event() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (user_id, actor_id, type, event_id, data)
  select p.id, new.created_by, 'new_event', new.id, jsonb_build_object('title', new.title)
    from public.profiles p
   where p.status = 'active'
     and p.id <> new.created_by
     and public.wants(p.notify_prefs, 'new_event');
  return new;
end;
$$;
drop trigger if exists events_notify_insert on public.events;
create trigger events_notify_insert after insert on public.events
  for each row execute function public.notify_new_event();

-- Modifiche importanti (data, ora, luogo, annullamento) → chi è interessato
create or replace function public.notify_event_update() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_changes text[] := '{}';
  v_type    text   := 'event_updated';
  v_actor   uuid   := coalesce((select auth.uid()), new.created_by);
begin
  if new.is_cancelled and not old.is_cancelled then
    v_type := 'event_cancelled';
  else
    if new.starts_at is distinct from old.starts_at then
      v_changes := v_changes || 'starts_at'::text;
    end if;
    if new.ends_at is distinct from old.ends_at then
      v_changes := v_changes || 'ends_at'::text;
    end if;
    if new.location_name is distinct from old.location_name
       or new.address is distinct from old.address
       or new.city is distinct from old.city then
      v_changes := v_changes || 'location'::text;
    end if;
    if old.is_cancelled and not new.is_cancelled then
      v_changes := v_changes || 'restored'::text;
    end if;
    if coalesce(array_length(v_changes, 1), 0) = 0 then
      return new;
    end if;
  end if;

  insert into public.notifications (user_id, actor_id, type, event_id, data)
  select r.user_id, v_actor, v_type, new.id,
         jsonb_build_object('title', new.title, 'changes', to_jsonb(v_changes))
    from (
      select user_id from public.rsvps where event_id = new.id and status in ('going', 'maybe')
      union
      select user_id from public.saved_events where event_id = new.id
      union
      select new.created_by
    ) r
    join public.profiles p on p.id = r.user_id
   where p.status = 'active'
     and r.user_id <> v_actor
     and public.wants(p.notify_prefs, 'event_updates');
  return new;
end;
$$;
drop trigger if exists events_notify_update on public.events;
create trigger events_notify_update after update on public.events
  for each row execute function public.notify_event_update();

-- Nuovo commento → organizzatore, partecipanti, chi ha commentato o salvato;
-- risposta → anche l'autore del commento a cui si risponde
create or replace function public.notify_new_comment() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_event         public.events;
  v_parent_author uuid;
  v_snippet       text := left(regexp_replace(btrim(new.body), '\s+', ' ', 'g'), 140);
begin
  select * into v_event from public.events where id = new.event_id;
  if new.parent_id is not null then
    select user_id into v_parent_author from public.comments where id = new.parent_id;
  end if;

  if v_parent_author is not null and v_parent_author <> new.user_id then
    insert into public.notifications (user_id, actor_id, type, event_id, comment_id, data)
    select p.id, new.user_id, 'comment_reply', new.event_id, new.id,
           jsonb_build_object('title', v_event.title, 'snippet', v_snippet)
      from public.profiles p
     where p.id = v_parent_author
       and p.status = 'active'
       and public.wants(p.notify_prefs, 'comments');
  end if;

  insert into public.notifications (user_id, actor_id, type, event_id, comment_id, data)
  select r.user_id, new.user_id, 'new_comment', new.event_id, new.id,
         jsonb_build_object('title', v_event.title, 'snippet', v_snippet)
    from (
      select v_event.created_by as user_id
      union select user_id from public.rsvps where event_id = new.event_id and status in ('going', 'maybe')
      union select user_id from public.comments where event_id = new.event_id
      union select user_id from public.saved_events where event_id = new.event_id
    ) r
    join public.profiles p on p.id = r.user_id
   where p.status = 'active'
     and r.user_id <> new.user_id
     and r.user_id is distinct from v_parent_author
     and public.wants(p.notify_prefs, 'comments');
  return new;
end;
$$;
drop trigger if exists comments_notify_insert on public.comments;
create trigger comments_notify_insert after insert on public.comments
  for each row execute function public.notify_new_comment();

-- Un amico conferma "Partecipo" → chi partecipa (o forse) e l'organizzatore
create or replace function public.notify_rsvp() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_event public.events;
begin
  if new.status <> 'going' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'going' then
    return new;
  end if;
  select * into v_event from public.events where id = new.event_id;
  if v_event.effective_end < now() or v_event.is_cancelled then
    return new;
  end if;

  insert into public.notifications (user_id, actor_id, type, event_id, data)
  select r.user_id, new.user_id, 'friend_going', new.event_id,
         jsonb_build_object('title', v_event.title)
    from (
      select user_id from public.rsvps
       where event_id = new.event_id and status in ('going', 'maybe')
      union
      select v_event.created_by
    ) r
    join public.profiles p on p.id = r.user_id
   where p.status = 'active'
     and r.user_id <> new.user_id
     and public.wants(p.notify_prefs, 'friend_going')
     and not exists (
       select 1 from public.notifications n
        where n.user_id = r.user_id and n.actor_id = new.user_id
          and n.event_id = new.event_id and n.type = 'friend_going'
          and n.created_at > now() - interval '12 hours'
     );
  return new;
end;
$$;
drop trigger if exists rsvps_notify on public.rsvps;
create trigger rsvps_notify after insert or update on public.rsvps
  for each row execute function public.notify_rsvp();

-- ---------------------------------------------------------------------
--  SICUREZZA: Row Level Security (nessun accesso per chi non è membro)
-- ---------------------------------------------------------------------

alter table public.profiles           enable row level security;
alter table public.invites            enable row level security;
alter table public.events             enable row level security;
alter table public.rsvps              enable row level security;
alter table public.comments           enable row level security;
alter table public.event_likes        enable row level security;
alter table public.saved_events       enable row level security;
alter table public.notifications      enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.app_secrets        enable row level security;

-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using ((select public.is_member()) or id = (select auth.uid()));
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

-- invites (solo admin; l'uso avviene tramite join_group)
drop policy if exists invites_admin_select on public.invites;
create policy invites_admin_select on public.invites for select to authenticated
  using ((select public.is_admin()));
drop policy if exists invites_admin_insert on public.invites;
create policy invites_admin_insert on public.invites for insert to authenticated
  with check ((select public.is_admin()) and created_by = (select auth.uid()));
drop policy if exists invites_admin_update on public.invites;
create policy invites_admin_update on public.invites for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists invites_admin_delete on public.invites;
create policy invites_admin_delete on public.invites for delete to authenticated
  using ((select public.is_admin()));

-- events
drop policy if exists events_select on public.events;
create policy events_select on public.events for select to authenticated
  using ((select public.is_member()));
drop policy if exists events_insert on public.events;
create policy events_insert on public.events for insert to authenticated
  with check ((select public.is_member()) and created_by = (select auth.uid()));
drop policy if exists events_update on public.events;
create policy events_update on public.events for update to authenticated
  using ((select public.is_member()) and (created_by = (select auth.uid()) or (select public.is_admin())))
  with check ((select public.is_member()) and (created_by = (select auth.uid()) or (select public.is_admin())));
drop policy if exists events_delete on public.events;
create policy events_delete on public.events for delete to authenticated
  using ((select public.is_member()) and (created_by = (select auth.uid()) or (select public.is_admin())));

-- rsvps
drop policy if exists rsvps_select on public.rsvps;
create policy rsvps_select on public.rsvps for select to authenticated
  using ((select public.is_member()));
drop policy if exists rsvps_insert on public.rsvps;
create policy rsvps_insert on public.rsvps for insert to authenticated
  with check ((select public.is_member()) and user_id = (select auth.uid()));
drop policy if exists rsvps_update on public.rsvps;
create policy rsvps_update on public.rsvps for update to authenticated
  using ((select public.is_member()) and user_id = (select auth.uid()))
  with check ((select public.is_member()) and user_id = (select auth.uid()));
drop policy if exists rsvps_delete on public.rsvps;
create policy rsvps_delete on public.rsvps for delete to authenticated
  using (user_id = (select auth.uid()));

-- comments
drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments for select to authenticated
  using ((select public.is_member()));
drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments for insert to authenticated
  with check ((select public.is_member()) and user_id = (select auth.uid()));
drop policy if exists comments_update on public.comments;
create policy comments_update on public.comments for update to authenticated
  using ((select public.is_member()) and user_id = (select auth.uid()))
  with check ((select public.is_member()) and user_id = (select auth.uid()));
drop policy if exists comments_delete on public.comments;
create policy comments_delete on public.comments for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- event_likes
drop policy if exists likes_select on public.event_likes;
create policy likes_select on public.event_likes for select to authenticated
  using ((select public.is_member()));
drop policy if exists likes_insert on public.event_likes;
create policy likes_insert on public.event_likes for insert to authenticated
  with check ((select public.is_member()) and user_id = (select auth.uid()));
drop policy if exists likes_delete on public.event_likes;
create policy likes_delete on public.event_likes for delete to authenticated
  using (user_id = (select auth.uid()));

-- saved_events (ognuno vede solo i propri)
drop policy if exists saved_select on public.saved_events;
create policy saved_select on public.saved_events for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists saved_insert on public.saved_events;
create policy saved_insert on public.saved_events for insert to authenticated
  with check ((select public.is_member()) and user_id = (select auth.uid()));
drop policy if exists saved_delete on public.saved_events;
create policy saved_delete on public.saved_events for delete to authenticated
  using (user_id = (select auth.uid()));

-- notifications (ognuno vede solo le proprie)
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));

-- push_subscriptions (inserimento tramite save_push_subscription)
drop policy if exists push_select on public.push_subscriptions;
create policy push_select on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists push_delete on public.push_subscriptions;
create policy push_delete on public.push_subscriptions for delete to authenticated
  using (user_id = (select auth.uid()));

-- app_secrets: nessuna policy → leggibile solo dal server (service role)
revoke all on public.app_secrets from anon, authenticated;

-- ---------------------------------------------------------------------
--  PERMESSI SULLE FUNZIONI
-- ---------------------------------------------------------------------

revoke execute on function public.join_group(text, text)                         from public, anon;
revoke execute on function public.admin_list_members()                           from public, anon;
revoke execute on function public.save_push_subscription(text, text, text, text) from public, anon;
revoke execute on function public.claim_pending_push(int)                        from public, anon, authenticated;

grant execute on function public.join_group(text, text)                         to authenticated;
grant execute on function public.admin_list_members()                           to authenticated;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;
grant execute on function public.get_invite_info(text)                          to anon, authenticated;
grant execute on function public.group_has_members()                            to anon, authenticated;
grant execute on function public.claim_pending_push(int)                        to service_role;

-- funzioni interne (trigger e controlli): mai richiamabili dall'esterno
revoke execute on function public.events_before_write()    from public, anon, authenticated;
revoke execute on function public.rsvps_before_write()     from public, anon, authenticated;
revoke execute on function public.comments_before_write()  from public, anon, authenticated;
revoke execute on function public.profiles_before_update() from public, anon, authenticated;
revoke execute on function public.notify_new_event()       from public, anon, authenticated;
revoke execute on function public.notify_event_update()    from public, anon, authenticated;
revoke execute on function public.notify_new_comment()     from public, anon, authenticated;
revoke execute on function public.notify_rsvp()            from public, anon, authenticated;
revoke execute on function public.is_member()              from public, anon;
revoke execute on function public.is_admin()               from public, anon;
grant execute on function public.is_member()               to authenticated;
grant execute on function public.is_admin()                to authenticated;

-- ---------------------------------------------------------------------
--  ARCHIVIAZIONE IMMAGINI (bucket privati: locandine e foto profilo)
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('event-images', 'event-images', false, 10485760, array['image/jpeg','image/png','image/webp','image/gif']),
  ('avatars',      'avatars',      false,  5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "ci_sei_images_select" on storage.objects;
create policy "ci_sei_images_select" on storage.objects for select to authenticated
  using (bucket_id in ('event-images', 'avatars') and (select public.is_member()));

drop policy if exists "ci_sei_images_insert" on storage.objects;
create policy "ci_sei_images_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id in ('event-images', 'avatars')
    and (select public.is_member())
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "ci_sei_images_update" on storage.objects;
create policy "ci_sei_images_update" on storage.objects for update to authenticated
  using (bucket_id in ('event-images', 'avatars') and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "ci_sei_images_delete" on storage.objects;
create policy "ci_sei_images_delete" on storage.objects for delete to authenticated
  using (
    bucket_id in ('event-images', 'avatars')
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin()))
  );

-- ---------------------------------------------------------------------
--  TEMPO REALE (aggiornamenti istantanei su tutti i telefoni)
-- ---------------------------------------------------------------------

do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['events','rsvps','comments','event_likes','notifications','profiles'] loop
      if not exists (
        select 1 from pg_publication_tables
         where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
      ) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end;
$$;
