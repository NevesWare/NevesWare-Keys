-- Tarefas da importação do catálogo (rodadas pela Edge Function catalog-seed).
-- 1) categorias de bebidas do Brasil  2) marcas (só códigos 789/790)  3) produtos do Brasil em geral
insert into public.catalog_seed (id, priority, kind, params, br_only, max_pages) values
  ('cat:bebidas-br',      10, 'tag', '{"categories":"beverages","countries":"brazil"}', false, 120),
  ('cat:sucos-br',        11, 'tag', '{"categories":"fruit-juices","countries":"brazil"}', false, 30),
  ('cat:nectares-br',     12, 'tag', '{"categories":"nectars","countries":"brazil"}', false, 20),
  ('cat:refrigerantes-br',13, 'tag', '{"categories":"sodas","countries":"brazil"}', false, 30),
  ('cat:aguas-br',        14, 'tag', '{"categories":"waters","countries":"brazil"}', false, 20),
  ('cat:cervejas-br',     15, 'tag', '{"categories":"beers","countries":"brazil"}', false, 30),
  ('cat:cha-br',          16, 'tag', '{"categories":"teas","countries":"brazil"}', false, 15),
  ('cat:lacteas-br',      17, 'tag', '{"categories":"dairy-drinks","countries":"brazil"}', false, 15),
  ('cat:energeticos-br',  18, 'tag', '{"categories":"energy-drinks","countries":"brazil"}', false, 10),
  ('cat:vegetais-br',     19, 'tag', '{"categories":"plant-based-beverages","countries":"brazil"}', false, 10)
on conflict (id) do nothing;

insert into public.catalog_seed (id, priority, kind, params, br_only, max_pages)
select 'marca:' || t, 30, 'term', jsonb_build_object('q', t), true, 5
from unnest(array[
  -- sucos, néctares, concentrados, refrescos
  'bela ischia','dafruta','da fruta','maguary','del valle','ades','cristal','passa quatro','nosso coco','do bem','superbom','tial','sufresh',
  'natural one','suvalan','tampico','marata','imbiara','frutop','juxx','greenpeople','puro sumo','prats','natural da terra','valle','xando',
  'tang','fresh','clight','mid','ki-suco','frisco','camp','qualy suco','nutri necta','ducoco','kero coco','obrigado','sococo','mais coco','coco do vale','puro coco',
  -- chás e mate
  'mate leao','matte leao','leao fuze','fuze tea','lipton','feel good','mate couro','chimarrao','yerba',
  -- refrigerantes
  'coca-cola','coca cola','fanta','sprite','kuat','schweppes','crystal','pepsi','guarana antarctica','antarctica','sukita','h2oh','soda limonada',
  'itubaina','dolly','mineirinho','convencao','guarana jesus','grapette','tubaina','frevo','pakera','goob','cotuba','charrua','tobi',
  -- águas
  'minalba','bonafont','sao lourenco','indaia','lindoya','pureza vital','serra da canastra','schin','agua mineral',
  -- cervejas
  'skol','brahma','heineken','budweiser','amstel','itaipava','devassa','original','bohemia','stella artois','corona','eisenbahn','spaten',
  'petra','crystal cerveja','kaiser','nova schin','imperio','colorado','baden baden','becks','michelob',
  -- energéticos e isotônicos
  'red bull','monster','tnt energy','burn','fusion','baly','gatorade','powerade','vibe energy','flying horse',
  -- lácteos e achocolatados
  'toddynho','nescau','toddy','yakult','italac','piracanjuba','itambe','parmalat','ninho','molico','danone','vigor','batavo','elege',
  'betania','camponesa','jussara','nestle','chandelle','nesfit','pense zero','alpro','naveia','a tal da castanha','vida veg'
]) as t
on conflict (id) do nothing;

insert into public.catalog_seed (id, priority, kind, params, br_only, max_pages) values
  ('geral:brasil', 90, 'tag', '{"countries":"brazil"}', false, 400)
on conflict (id) do nothing;
