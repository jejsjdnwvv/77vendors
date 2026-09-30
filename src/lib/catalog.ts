import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type ProviderRow = {
  id: string;
  key: string;
  name: string;
  active: boolean;
  sort_order: number;
};

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  active: boolean;
};

export type ProductRow = {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  price_cents: number;
  compare_at_cents: number | null;
  image_url: string | null;
  images: unknown;
  category_id: string | null;
  stock: number | null;
  available: boolean;
  published: boolean;
  terms: string | null;
  purchase_count: number;
  created_at: string;
};

export type ProductWithProviders = ProductRow & { providerIds: string[] };

export const providersQuery = queryOptions({
  queryKey: ["providers"],
  queryFn: async (): Promise<ProviderRow[]> => {
    const { data, error } = await supabase
      .from("providers")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []) as ProviderRow[];
  },
  staleTime: 5 * 60_000,
});

export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: async (): Promise<CategoryRow[]> => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []) as CategoryRow[];
  },
  staleTime: 5 * 60_000,
});

async function attachProviders(products: ProductRow[]): Promise<ProductWithProviders[]> {
  if (products.length === 0) return [];
  const { data } = await supabase
    .from("product_providers")
    .select("product_id, provider_id, enabled")
    .in(
      "product_id",
      products.map((p) => p.id),
    );
  const map = new Map<string, string[]>();
  for (const row of data ?? []) {
    if (!row.enabled) continue;
    const list = map.get(row.product_id) ?? [];
    list.push(row.provider_id);
    map.set(row.product_id, list);
  }
  return products.map((p) => ({ ...p, providerIds: map.get(p.id) ?? [] }));
}

export const publishedProductsQuery = queryOptions({
  queryKey: ["products", "published"],
  queryFn: async (): Promise<ProductWithProviders[]> => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("published", true)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return attachProviders((data ?? []) as ProductRow[]);
  },
  staleTime: 30_000,
});

export function productBySlugQuery(slug: string) {
  return queryOptions({
    queryKey: ["product", slug],
    queryFn: async (): Promise<ProductWithProviders | null> => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const [withProviders] = await attachProviders([data as ProductRow]);
      return withProviders ?? null;
    },
  });
}

export const settingsQuery = queryOptions({
  queryKey: ["app-settings"],
  queryFn: async () => {
    const { data, error } = await supabase.from("app_settings").select("*").maybeSingle();
    if (error) throw error;
    return data;
  },
  staleTime: 5 * 60_000,
});
