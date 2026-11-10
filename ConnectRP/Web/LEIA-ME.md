# Versão de navegador

`connect-rp.html` é a página de carregamento usada na versão publicada no Claude.
O host aceita poucas extensões e no máximo 15 MB por arquivo, por isso:

1. Exporte: `godot --headless --export-release "Web" build/web/index.html`
2. Comprima o motor: `gzip -9 -c build/web/index.wasm > engine.gz.wasm` (35 MB → 8 MB)
3. Copie os dados: `cp build/web/index.pck data.pck.wasm`
4. Publique `connect-rp.html` junto com `index.js`, `index.audio.worklet.js`,
   `engine.gz.wasm` e `data.pck.wasm`.

A página descomprime o motor no próprio navegador (`DecompressionStream`) e entrega
os arquivos ao Godot com os nomes originais. Em qualquer outro host (GitHub Pages,
itch.io, Netlify) basta publicar a pasta `build/web` direto, sem esses passos.

Limitações no navegador: sem multiplayer por IP (ENet não existe na web); o progresso
fica salvo só naquele navegador.
