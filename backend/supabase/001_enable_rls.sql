begin;

alter table public.sessions enable row level security;
alter table public.conversations enable row level security;
alter table public.results enable row level security;

revoke all on table public.sessions from anon, authenticated;
revoke all on table public.conversations from anon, authenticated;
revoke all on table public.results from anon, authenticated;

commit;
