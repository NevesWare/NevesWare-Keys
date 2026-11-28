-- Tarefas extras da importação: mercado em geral (categorias do Brasil, marcas de mercado,
-- limpeza/higiene/pet nas bases irmãs do Open Food Facts).

-- 1) Categorias de mercado do Brasil (prioridade 20–29, antes das marcas restantes)
insert into public.catalog_seed (id, priority, kind, params, br_only, max_pages)
select 'cat:' || c.slug || '-br', 20, 'tag', jsonb_build_object('categories', c.slug, 'countries', 'brazil', 'cat', c.cat), false, c.pages
from (values
  ('sugars','Alimentos',10), ('rices','Alimentos',10), ('beans','Alimentos',10), ('legumes','Alimentos',10), ('coffees','Alimentos',15),
  ('vegetable-oils','Alimentos',10), ('pastas','Alimentos',15), ('biscuits','Padaria',30), ('cookies','Padaria',15), ('chocolates','Alimentos',30),
  ('flours','Alimentos',10), ('salts','Alimentos',5), ('sauces','Alimentos',15), ('condiments','Alimentos',15), ('canned-foods','Alimentos',15),
  ('milks','Laticínios',15), ('cheeses','Laticínios',15), ('yogurts','Laticínios',15), ('butters','Laticínios',5), ('margarines','Laticínios',5),
  ('creams','Laticínios',10), ('meats','Carnes',15), ('sausages','Carnes',10), ('hams','Carnes',5), ('salty-snacks','Alimentos',20),
  ('breakfast-cereals','Alimentos',15), ('breads','Padaria',15), ('cakes','Padaria',10), ('confectioneries','Alimentos',20), ('candies','Alimentos',10),
  ('spices','Alimentos',10), ('frozen-foods','Congelados',15), ('ice-creams','Congelados',10), ('desserts','Alimentos',10), ('baby-foods','Alimentos',10),
  ('cocoa-and-its-products','Alimentos',10), ('jams','Alimentos',5), ('honeys','Alimentos',5), ('nuts','Alimentos',10), ('dried-fruits','Alimentos',5),
  ('instant-noodles','Alimentos',5), ('soups','Alimentos',5), ('mayonnaises','Alimentos',5), ('ketchup','Alimentos',5), ('olive-oils','Alimentos',5),
  ('vinegars','Alimentos',5), ('popcorn','Alimentos',5), ('cereal-bars','Alimentos',5), ('crackers','Padaria',10), ('powdered-milks','Laticínios',5)
) as c(slug, cat, pages)
on conflict (id) do nothing;

-- 2) Marcas de mercado (só códigos brasileiros 789/790)
insert into public.catalog_seed (id, priority, kind, params, br_only, max_pages)
select 'marca:' || t, 31, 'term', jsonb_build_object('q', t), true, 5
from unnest(array[
  -- açúcar, arroz, feijão, grãos
  'uniao','caravelas','guarani','da barra','alto alegre','native','tio joao','camil','prato fino','namorado','blue ville','urbano','kicaldo','broto legal','sepe','pink','combrasil','yoki','kimilho','sinha',
  -- café, chá, achocolatado
  'pilao','melitta','3 coracoes','cafe do ponto','cafe pele','santa clara','caboclo','nescafe','bom dia','cafe brasileiro','marata','pimpinela','baggio','dois frades',
  -- óleo, azeite, vinagre, sal
  'soya','liza','salada','cocamar','gallo','andorinha','borges','castelo','cisne','lebre','mosteiro',
  -- massas, farinhas, misturas
  'renata','adria','barilla','galo','santa amalia','divella','petybon','dona benta','vitarella','fortaleza','isabela','orquidea','anaconda','fleischmann','dr oetker','royal','sol',
  -- biscoitos, bolos, pães
  'bauducco','marilan','piraque','mabel','tostines','trakinas','club social','passatempo','oreo','negresco','richester','vitarella','wickbold','pullman','seven boys','plus vita','visconti','panco','ana maria','bisnaguito',
  -- chocolates e doces
  'lacta','garoto','hershey','arcor','kopenhagen','cacau show','fini','freegells','halls','trident','mentos','dori','santa helena','jazam','pacoquita','bis','baton','kitkat','sonho de valsa','talento',
  -- molhos, temperos, enlatados
  'pomarola','quero','heinz','hellmanns','elefante','fugini','arisco','knorr','maggi','sazon','kitano','hikari','gomes da costa','coqueiro','predilecta','bonduelle','oderich','cajamar','etti','tambau','ajinomoto','sakura','karui',
  -- lácteos
  'tirol','polenghi','president','quata','aviacao','paulista','nestle moca','leite moca','ninho','itambe','piracanjuba','vigor','danone','batavo','elege','italac','betania','camponesa','jussara','scala','tirolez','qualy','doriana','delicia','becel','claybom',
  -- carnes e frios
  'sadia','perdigao','seara','aurora','swift','friboi','frimesa','rezende','pif paf','copacol','big frango','minuano','marba','ceratti',
  -- snacks e cereais
  'elma chips','doritos','ruffles','cheetos','pringles','fandangos','torcida','yoki pipoca','kellogg','sucrilhos','nesfit','mae terra','jasmine','nutry','trio',
  -- congelados e sorvetes
  'kibon','nestle sorvete','sadia congelados','seara congelados','mccain','bem brasil','forno de minas',
  -- bebê
  'nestle nan','aptamil','mucilon','neston','farinha lactea','cerelac'
]) as t
on conflict (id) do nothing;

-- 3) Limpeza (Open Products Facts), higiene e cosméticos (Open Beauty Facts), pet (Open Pet Food Facts)
insert into public.catalog_seed (id, priority, kind, params, br_only, max_pages) values
  ('opf:brasil', 25, 'tag', '{"site":"opf","countries":"brazil","cat":"Limpeza"}', false, 40),
  ('obf:brasil', 25, 'tag', '{"site":"obf","countries":"brazil","cat":"Higiene"}', false, 60),
  ('opff:brasil', 25, 'tag', '{"site":"opff","countries":"brazil","cat":"Pet"}', false, 20)
on conflict (id) do nothing;

insert into public.catalog_seed (id, priority, kind, params, br_only, max_pages)
select 'limpeza:' || t, 32, 'term', jsonb_build_object('q', t, 'site', 'opf', 'cat', 'Limpeza'), true, 3
from unnest(array['ype','omo','comfort','veja','pinho sol','bombril','minuano','limpol','brilhante','ariel','downy','assolan','sanol','harpic','lysoform','qboa','mr musculo','tixan','surf','ace','vanish','urca','scotch brite','esfrebom','kalipto','bom ar','glade','sbp','raid','baygon','neutrol','fofo','mon bijou','candura','ypê']) as t
on conflict (id) do nothing;

insert into public.catalog_seed (id, priority, kind, params, br_only, max_pages)
select 'higiene:' || t, 32, 'term', jsonb_build_object('q', t, 'site', 'obf', 'cat', 'Higiene'), true, 3
from unnest(array['colgate','oral b','sorriso','close up','dove','lux','palmolive','protex','rexona','nivea','seda','pantene','elseve','head shoulders','johnsons','neutrogena','sempre livre','always','intimus','neve','personal','scott','pampers','huggies','turma da monica','monange','granado','phebo','francis','natura','boticario','eudora','avon','tresemme','clear','garnier','loreal','monange','gillette','bic','axe','above','herbissimo','salon line','skala','lola']) as t
on conflict (id) do nothing;

insert into public.catalog_seed (id, priority, kind, params, br_only, max_pages)
select 'pet:' || t, 32, 'term', jsonb_build_object('q', t, 'site', 'opff', 'cat', 'Pet'), true, 3
from unnest(array['pedigree','whiskas','purina','golden','premier','friskies','dog chow','cat chow','special dog','special cat','magnus','foster','guabi','three dogs','biofresh']) as t
on conflict (id) do nothing;
