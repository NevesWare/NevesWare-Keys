// RS Stock W — Edge Function "catalog-seed"
// Importa produtos reais do Open Food Facts para a tabela catalog, em segundo plano.
// Percorre as tarefas de public.catalog_seed (bebidas do Brasil, marcas, Brasil em geral), página por página,
// respeitando o limite do Open Food Facts (~10 buscas/min), e se chama de novo até terminar.
// Só roda com o cabeçalho x-seed-key igual ao segredo guardado em public.app_secrets (invisível para o app).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const URL_SELF = Deno.env.get("SUPABASE_URL") + "/functions/v1/catalog-seed";
const UA = "RSStockW/2.6 (FlowLabs Studio; catalogo de validade)";
const PAGE_SIZE = 100;
const GAP_MS = 6500;          // ~9 buscas por minuto
const BUDGET_MS = 85_000;     // tempo por execução (depois se chama de novo)
const FIELDS = "code,product_name,product_name_pt,generic_name_pt,brands,quantity,categories_tags,image_front_small_url,image_small_url";

const UNIT: Record<string, string> = { kg: "kg", g: "g", gr: "g", grs: "g", mg: "mg", l: "L", lt: "L", lts: "L", litro: "L", litros: "L", ml: "ml", cl: "cl", un: "un", und: "un", unid: "un" };
function parseSize(text: string) {
  const m = String(text || "").toLowerCase().replace(",", ".").match(/(\d+(?:\.\d+)?)\s*(kg|grs|gr|g|mg|litros|litro|lts|lt|l|ml|cl|unid|und|un)\b/);
  if (!m) return { size: "", value: null as number | null, unit: "" };
  const value = Number(m[1]); const unit = UNIT[m[2]] || m[2];
  return { size: (Number.isInteger(value) ? String(value) : String(value).replace(".", ",")) + (unit === "un" ? " un" : unit), value, unit };
}
function categoryFrom(tags: string[], text = "") {
  const t = (tags || []).join(" ") + " " + text.toLowerCase();
  const has = (...k: string[]) => k.some((x) => t.includes(x));
  if (has("dairies", "milk", "cheese", "yogurt", "leite", "queijo", "iogurte", "laticin", "dairy-drinks")) return "Laticínios";
  if (has("beverage", "drink", "juice", "nectar", "soda", "water", "bebida", "suco", "refrigerante", "cerveja", "beer", "tea")) return "Bebidas";
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
function fullName(base: string, brand: string, size: string) {
  let n = String(base || "").replace(/\s+/g, " ").trim();
  if (!n) return "";
  const b = String(brand || "").split(",")[0].trim();
  if (b && !n.toLowerCase().includes(b.toLowerCase())) n += " " + b;
  if (size && !/\d/.test(n.replace(/\d{8,}/g, ""))) n += " " + size.replace(" ", "");
  return (n.charAt(0).toUpperCase() + n.slice(1)).slice(0, 160);
}
function toRow(p: any) {
  const code = String(p.code || "").replace(/\D/g, "");
  if (!/^\d{8,14}$/.test(code)) return null;
  const base = p.product_name_pt || p.product_name || p.generic_name_pt || "";
  if (!base || base.length < 2) return null;
  const sz = parseSize(p.quantity || base);
  const brand = String(p.brands || "").split(",")[0].trim().slice(0, 80);
  return {
    barcode: code, name: fullName(base, brand, sz.size), brand, size: (sz.size || String(p.quantity || "")).slice(0, 30),
    size_value: sz.value, size_unit: sz.unit, category: categoryFrom(p.categories_tags || [], base),
    image_url: String(p.image_front_small_url || p.image_small_url || "").slice(0, 300), source: "off",
  };
}

function searchUrl(job: any, page: number) {
  const q = new URLSearchParams({ action: "process", json: "1", page_size: String(PAGE_SIZE), page: String(page), fields: FIELDS, sort_by: "unique_scans_n" });
  if (job.kind === "term") {
    q.set("search_terms", job.params.q); q.set("search_simple", "1");
  } else {
    let i = 0;
    for (const [type, tag] of [["categories", job.params.categories], ["countries", job.params.countries]]) {
      if (!tag) continue;
      q.set(`tagtype_${i}`, type); q.set(`tag_contains_${i}`, "contains"); q.set(`tag_${i}`, tag); i++;
    }
  }
  return "https://world.openfoodfacts.org/cgi/search.pl?" + q.toString();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: sec } = await db.from("app_secrets").select("value").eq("name", "seed_key").maybeSingle();
  const key = req.headers.get("x-seed-key") || "";
  if (!sec || !key || key !== sec.value) return new Response("forbidden", { status: 403 });

  const started = Date.now();
  let pages = 0, added = 0, failures = 0;
  const log: string[] = [];

  while (Date.now() - started < BUDGET_MS) {
    const { data: job } = await db.from("catalog_seed").select("*").eq("done", false).order("priority").order("id").limit(1).maybeSingle();
    if (!job) break;
    const page = job.next_page;
    let body: any = null;
    try {
      const r = await fetch(searchUrl(job, page), { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(25000) });
      if (r.status === 429 || r.status >= 500) throw new Error("HTTP " + r.status);
      body = await r.json();
    } catch (e) {
      failures++;
      await db.from("catalog_seed").update({ last_error: String(e).slice(0, 200), updated_at: new Date().toISOString() }).eq("id", job.id);
      if (failures >= 3) { log.push("muitas falhas, pausando"); break; }
      await sleep(20000);
      continue;
    }
    pages++;
    const prods: any[] = Array.isArray(body.products) ? body.products : [];
    let rows = prods.map(toRow).filter(Boolean) as any[];
    if (job.br_only) rows = rows.filter((r) => /^(789|790)/.test(r.barcode));
    // dedup na página
    const seen = new Set<string>(); rows = rows.filter((r) => (seen.has(r.barcode) ? false : (seen.add(r.barcode), true)));
    let n = 0;
    if (rows.length) {
      const before = await db.from("catalog").select("barcode", { count: "exact", head: true });
      const { error } = await db.from("catalog").upsert(rows, { onConflict: "barcode", ignoreDuplicates: true });
      if (error) log.push(job.id + ": " + error.message);
      const after = await db.from("catalog").select("barcode", { count: "exact", head: true });
      n = Math.max(0, (after.count || 0) - (before.count || 0));
    }
    added += n;
    const finished = prods.length < PAGE_SIZE || page >= job.max_pages;
    await db.from("catalog_seed").update({
      next_page: page + 1, done: finished, added: (job.added || 0) + n, seen: (job.seen || 0) + prods.length,
      last_error: "", updated_at: new Date().toISOString(),
    }).eq("id", job.id);
    log.push(`${job.id} p${page}: ${prods.length} lidos, +${n}`);
    await sleep(GAP_MS);
  }

  const { count: left } = await db.from("catalog_seed").select("id", { count: "exact", head: true }).eq("done", false);
  const again = (left || 0) > 0 && failures < 3;
  if (again) {
    // continua em segundo plano numa nova execução
    // @ts-ignore EdgeRuntime existe no Supabase
    // só dispara a próxima execução (não espera ela terminar, para não estourar o tempo desta)
    // @ts-ignore EdgeRuntime existe no Supabase
    EdgeRuntime.waitUntil(Promise.race([
      fetch(URL_SELF, { method: "POST", headers: { "x-seed-key": key, "Content-Type": "application/json" }, body: "{}" }).catch(() => {}),
      sleep(4000),
    ]));
  }
  return new Response(JSON.stringify({ pages, added, left, continuing: again, log }), { headers: { "Content-Type": "application/json" } });
});
