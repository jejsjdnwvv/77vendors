-- 77 Vendors: branding, two-admin allowlist, clothing categories, and image storage.

update public.app_settings
set store_name = '77 Vendors',
    store_description = 'A curated marketplace for clothing vendor links.',
    admin_email = 'vynesgithuv@gmail.com',
    support_email = 'jose77discord@gmail.com',
    updated_at = now()
where id = true;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  ) on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url);

  if lower(coalesce(new.email,'')) = any(array[
    'vynesgithuv@gmail.com',
    'jose77discord@gmail.com'
  ]) then
    insert into public.user_roles (user_id, role)
    values (new.id, 'admin') on conflict do nothing;
  else
    insert into public.user_roles (user_id, role)
    values (new.id, 'user') on conflict do nothing;
  end if;
  return new;
end; $$;

-- Promote either admin if the accounts already exist.
insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role
from auth.users
where lower(email) = any(array['vynesgithuv@gmail.com', 'jose77discord@gmail.com'])
on conflict do nothing;

insert into public.categories (name, slug, sort_order)
values
  ('Hoodies','hoodies',10),
  ('T-Shirts','t-shirts',20),
  ('Bottoms','bottoms',30),
  ('Shoes','shoes',40),
  ('Outerwear','outerwear',50),
  ('Accessories','accessories',60)
on conflict (slug) do update set active = true, name = excluded.name, sort_order = excluded.sort_order;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  10485760,
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "public product images read"
on storage.objects for select to public
using (bucket_id = 'product-images');

create policy "admins upload product images"
on storage.objects for insert to authenticated
with check (bucket_id = 'product-images' and public.has_role(auth.uid(), 'admin'));

create policy "admins update product images"
on storage.objects for update to authenticated
using (bucket_id = 'product-images' and public.has_role(auth.uid(), 'admin'))
with check (bucket_id = 'product-images' and public.has_role(auth.uid(), 'admin'));

create policy "admins delete product images"
on storage.objects for delete to authenticated
using (bucket_id = 'product-images' and public.has_role(auth.uid(), 'admin'));

