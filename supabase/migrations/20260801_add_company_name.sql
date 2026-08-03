-- Add optional company_name (business name) to profiles
alter table public.profiles add column if not exists company_name text;

-- Update trigger to save company_name from signup metadata
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role, company_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'advertiser'),
    nullif(trim(coalesce(new.raw_user_meta_data->>'company_name', '')), '')
  );
  return new;
end;
$$;
