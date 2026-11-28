/* ==========================================================================
   Leitor de APK (sem bibliotecas): abre o .apk (zip), descompacta o
   AndroidManifest.xml (XML binário do Android) e lê package, versionCode
   e versionName. Também calcula o SHA-256 do arquivo inteiro — a
   "impressão digital" que o servidor usa para saber se o app está atualizado.
   ========================================================================== */
(function () {
  const ATTR_VERSION_CODE = 0x0101021b, ATTR_VERSION_NAME = 0x0101021c;

  async function readSlice(file, start, end) { return new Uint8Array(await file.slice(start, end).arrayBuffer()); }

  async function inflateRaw(bytes) {
    if (!('DecompressionStream' in window)) throw new Error('Este aparelho não consegue ler o APK automaticamente');
    const ds = new DecompressionStream('deflate-raw');
    const out = new Blob([bytes]).stream().pipeThrough(ds);
    return new Uint8Array(await new Response(out).arrayBuffer());
  }

  /* Encontra e extrai um arquivo de dentro do zip lendo só o necessário. */
  async function extract(file, wanted) {
    const tailSize = Math.min(file.size, 66000);
    const tail = await readSlice(file, file.size - tailSize, file.size);
    const tv = new DataView(tail.buffer);
    let eocd = -1;
    for (let i = tail.length - 22; i >= 0; i--) if (tv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error('Arquivo não parece ser um APK');
    const cdSize = tv.getUint32(eocd + 12, true), cdOff = tv.getUint32(eocd + 16, true);
    const cd = await readSlice(file, cdOff, cdOff + cdSize);
    const cv = new DataView(cd.buffer);
    let p = 0;
    while (p < cd.length && cv.getUint32(p, true) === 0x02014b50) {
      const method = cv.getUint16(p + 10, true), comp = cv.getUint32(p + 20, true);
      const nLen = cv.getUint16(p + 28, true), xLen = cv.getUint16(p + 30, true), cLen = cv.getUint16(p + 32, true);
      const local = cv.getUint32(p + 42, true);
      const name = new TextDecoder().decode(cd.subarray(p + 46, p + 46 + nLen));
      if (name === wanted) {
        const lh = await readSlice(file, local, local + 30);
        const lv = new DataView(lh.buffer);
        const start = local + 30 + lv.getUint16(26, true) + lv.getUint16(28, true);
        const raw = await readSlice(file, start, start + comp);
        return method === 0 ? raw : await inflateRaw(raw);
      }
      p += 46 + nLen + xLen + cLen;
    }
    throw new Error('AndroidManifest.xml não encontrado no APK');
  }

  /* Lê o XML binário (AXML) e devolve os atributos da tag <manifest>. */
  function parseManifest(buf) {
    const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    let strings = [], resIds = [];
    let p = v.getUint16(2, true); // pula o cabeçalho do XML
    while (p < buf.length) {
      const type = v.getUint16(p, true), hSize = v.getUint16(p + 2, true), size = v.getUint32(p + 4, true);
      if (!size) break;
      if (type === 0x0001) { // string pool
        const count = v.getUint32(p + 8, true), flags = v.getUint32(p + 16, true), strStart = v.getUint32(p + 20, true);
        const utf8 = (flags & 0x100) !== 0;
        for (let i = 0; i < count; i++) {
          let o = p + strStart + v.getUint32(p + hSize + i * 4, true);
          if (utf8) {
            let n = buf[o++]; if (n & 0x80) o++;
            let bl = buf[o++]; if (bl & 0x80) { bl = ((bl & 0x7f) << 8) | buf[o++]; }
            strings.push(new TextDecoder().decode(buf.subarray(o, o + bl)));
          } else {
            let n = v.getUint16(o, true); o += 2;
            if (n & 0x8000) { n = ((n & 0x7fff) << 16) | v.getUint16(o, true); o += 2; }
            let s = ''; for (let k = 0; k < n; k++) s += String.fromCharCode(v.getUint16(o + k * 2, true));
            strings.push(s);
          }
        }
      } else if (type === 0x0180) { // mapa de recursos dos atributos
        for (let i = p + 8; i < p + size; i += 4) resIds.push(v.getUint32(i, true));
      } else if (type === 0x0102) { // início de elemento
        const nameIdx = v.getUint32(p + 20, true);
        if (strings[nameIdx] === 'manifest') {
          const aStart = v.getUint16(p + 24, true), aSize = v.getUint16(p + 26, true), aCount = v.getUint16(p + 28, true);
          const out = {};
          for (let i = 0; i < aCount; i++) {
            const a = p + 16 + aStart + i * aSize;
            const an = v.getUint32(a + 4, true), raw = v.getInt32(a + 8, true), dType = buf[a + 15], data = v.getUint32(a + 16, true);
            const key = resIds[an] === ATTR_VERSION_CODE ? 'versionCode' : resIds[an] === ATTR_VERSION_NAME ? 'versionName' : strings[an];
            const val = dType === 0x03 ? strings[data] : (raw >= 0 ? strings[raw] : (dType === 0x10 || dType === 0x11 ? data : data));
            out[key] = (key === 'versionCode') ? Number(dType === 0x03 ? strings[data] : data) : val;
          }
          return out;
        }
      }
      p += size;
    }
    throw new Error('Não foi possível ler a versão do APK');
  }

  async function sha256(file) {
    const buf = await file.arrayBuffer();
    const h = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  RS.apk = {
    async inspect(file) {
      const [man, hash] = await Promise.all([extract(file, 'AndroidManifest.xml').then(parseManifest), sha256(file)]);
      return { packageName: man.package || '', versionCode: Number(man.versionCode) || null, versionName: man.versionName || '', sha256: hash, size: file.size };
    }
  };
})();
