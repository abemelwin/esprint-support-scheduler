-- ============================================================
-- Migration: admin_update_user RPC
-- Allows admins to update a user's email, password, and metadata in auth.users
-- Run this in Supabase -> SQL Editor
-- ============================================================

create or replace function public.admin_update_user(
  target_user_id uuid,
  new_email text default null,
  new_password text default null,
  new_name text default null
)
returns json
language plpgsql
security definer
as $$
declare
  is_admin boolean;
begin
  -- Check if caller is admin
  select (role = 'admin') into is_admin
  from public.app_users
  where auth_id = auth.uid();

  if is_admin is not true then
    raise exception 'Unauthorized: Only admins can update user credentials.';
  end if;

  -- Update email and metadata if provided
  if new_email is not null and new_email <> '' then
    update auth.users
    set email = new_email,
        raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('name', coalesce(new_name, raw_user_meta_data->>'name'))
    where id = target_user_id;
  elsif new_name is not null and new_name <> '' then
    update auth.users
    set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('name', new_name)
    where id = target_user_id;
  end if;

  -- Update password if provided
  if new_password is not null and new_password <> '' then
    update auth.users
    set encrypted_password = crypt(new_password, gen_salt('bf'))
    where id = target_user_id;
  end if;

  return json_build_object('success', true);
end;
$$;

grant execute on function public.admin_update_user(uuid, text, text, text) to authenticated;
