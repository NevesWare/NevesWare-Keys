// RS Stock W — Edge Function "product-lookup"
// Busca um produto pelo código de barras: 1) catálogo próprio (tabela catalog) → 2) Cosmos/Bluesoft
// (base brasileira; só se o segredo COSMOS_TOKEN estiver configurado) → 3) Open Food Facts.
// O que encontrar é guardado no catálogo, então a próxima leitura sai na hora para todo mundo.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

type Product = {
  barcode: string; name: string; brand: string; size: string; size_value: number | null; size_unit: string;
  category: string; image_url: string; source: "off" | "cosmos" | "user";
};

const UNIT: Record<string, string> = { kg: "kg", g: "g", gr: "g", grs: "g", mg: "mg", l: "L", lt: "L", lts: "L", litro: "L", litros: "L", ml: "ml", cl: "cl", un: "un", und: "un", unid: "un" };

function parseSize(text: string): { size: string; value: number | null; unit: string } {
  const m = String(text || "").toLowerCase().replace(",", ".").match(/(\d+(?:\.\d+)?)\s*(kg|grs|gr|g|mg|litros|litro|lts|lt|l|ml|cl|unid|und|un)\b/);
  if (!m) return { size: "", value: null, unit: "" };
  const value = Number(m[1]);
  const unit = UNIT[m[2]] || m[2];
  const shown = (Number.isInteger(value) ? String(value) : String(value).replace(".", ",")) + (unit === "un" ? " un" : unit);
  return { size: shown, value, unit };
}

function categoryFrom(tags: string[], text = ""): string {
  const t = (tags || []).join(" ") + " " + text.toLowerCase();
  const has = (...k: string[]) => k.some((x) => t.includes(x));
  if (has("dairies", "milk", "cheese", "yogurt", "leite", "queijo", "iogurte", "laticin")) return "Laticínios";
  if (has("beverage", "drink", "juice", "soda", "water", "bebida", "suco", "refrigerante", "cerveja", "beer")) return "Bebidas";
  if (has("meat", "sausage", "chicken", "carne", "frango", "linguica", "presunto")) return "Carnes";
  if (has("bread", "bakery", "biscuit", "cookie", "pao", "pão", "bolo", "biscoito")) return "Padaria";
  if (has("frozen", "congelad", "ice-cream", "sorvete")) return "Congelados";
  if (has("fruit", "vegetable", "fruta", "legume", "verdura")) return "Hortifruti";
  if (has("cleaning", "detergent", "limpeza", "sabao", "sabão", "desinfet", "amaciante")) return "Limpeza";
  if (has("hygiene", "shampoo", "toothpaste", "soap", "higiene", "creme dental", "desodorante", "papel higi")) return "Higiene";
  if (has("pet-food", "dog", "cat-food", "racao", "ração")) return "Pet";
  if (has("en:foods", "food", "snack", "cereal", "pasta", "rice", "sauce", "alimento")) return "Alimentos";
  return "";
}

/** Nome completo para o estoque: "Leite Integral Tirol 1L" (sem repetir marca/gramatura). */
function fullName(base: string, brand: string, size: string): string {
  let n = String(base || "").replace(/\s+/g, " ").trim();
  if (!n) return "";
  const low = n.toLowerCase();
  const b = String(brand || "").split(",")[0].trim();
  if (b && !low.includes(b.toLowerCase())) n += " " + b;
  if (size && !/\d/.test(n.replace(/\d{8,}/g, ""))) n += " " + size.replace(" ", "");
  return n.charAt(0).toUpperCase() + n.slice(1);
}

async function fromOFF(code: string): Promise<Product | null> {
  const fields = "product_name,product_name_pt,generic_name_pt,brands,quantity,categories_tags,image_front_small_url,image_small_url";
  for (const host of ["world.openfoodfacts.org", "br.openfoodfacts.org"]) {
    try {
      const r = await fetch(`https://${host}/api/v2/product/${code}.json?fields=${fields}`, {
        headers: { "User-Agent": "RSStockW/2.6 (FlowLabs Studio; controle de validade)" },
        signal: AbortSignal.timeout(6000),
      });
      if (!r.ok) continue;
      const d = await r.json();
      if (d.status !== 1 || !d.product) continue;
      const p = d.product;
      const base = p.product_name_pt || p.product_name || p.generic_name_pt || "";
      if (!base) continue;
      const sz = parseSize(p.quantity || base);
      const brand = String(p.brands || "").split(",")[0].trim();
      return {
        barcode: code, name: fullName(base, brand, sz.size), brand, size: sz.size || String(p.quantity || "").slice(0, 30),
        size_value: sz.value, size_unit: sz.unit, category: categoryFrom(p.categories_tags || [], base),
        image_url: p.image_front_small_url || p.image_small_url || "", source: "off",
      };
    } catch (_) { /* tenta o próximo */ }
  }
  return null;
}

async function fromCosmos(code: string, token: string): Promise<Product | null> {
  try {
    const r = await fetch(`https://api.cosmos.bluesoft.com.br/gtins/${code}.json`, {
      headers: { "X-Cosmos-Token": token, "User-Agent": "Cosmos-API-Request", "Content-Type": "application/json" },
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) return null;
    const p = await r.json();
    const base = p.description || "";
    if (!base) return null;
    const brand = (p.brand && p.brand.name) || "";
    const sz = parseSize(base);
    return {
      barcode: code, name: fullName(base.toLowerCase().replace(/\b\p{L}/gu, (c: string) => c.toUpperCase()), brand, sz.size), brand,
      size: sz.size, size_value: sz.value, size_unit: sz.unit,
      category: categoryFrom([], [base, p.gpc && p.gpc.description, p.ncm && p.ncm.description].filter(Boolean).join(" ")),
      image_url: p.thumbnail || "", source: "cosmos",
    };
  } catch (_) {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  let code = new URL(req.url).searchParams.get("code") || "";
  if (!code && req.method === "POST") { try { code = String((await req.json()).code || ""); } catch (_) { /* */ } }
  code = code.replace(/\D/g, "");
  if (!/^\d{6,14}$/.test(code)) return json({ found: false, error: "Código inválido" }, 400);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  // 1) catálogo próprio
  const { data: hit } = await db.from("catalog").select("*").eq("barcode", code).maybeSingle();
  if (hit) {
    db.from("catalog").update({ hits: (hit.hits || 0) + 1 }).eq("barcode", code).then(() => {});
    return json({ found: true, product: hit, cached: true });
  }

  // 2) Cosmos (se configurado) e 3) Open Food Facts
  const token = Deno.env.get("COSMOS_TOKEN") || "";
  let prod: Product | null = null;
  if (token) prod = await fromCosmos(code, token);
  if (!prod) prod = await fromOFF(code);
  if (!prod) return json({ found: false });

  await db.from("catalog").upsert({ ...prod, hits: 1, updated_at: new Date().toISOString() });
  return json({ found: true, product: prod, cached: false });
});
