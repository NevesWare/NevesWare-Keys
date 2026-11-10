/**
 * Bytes of a bundled asset URL. In the single-file build assets are inlined as
 * data: URLs, and the published page's CSP blocks fetch() of data: URLs, so
 * those are decoded by hand; dev builds use normal fetch.
 */
export async function bytesFromUrl(url) {
  if (url.startsWith('data:')) {
    const comma = url.indexOf(',');
    const meta = url.slice(5, comma);
    const body = url.slice(comma + 1);
    if (meta.endsWith(';base64')) {
      const bin = atob(body);
      const out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return out.buffer;
    }
    return new TextEncoder().encode(decodeURIComponent(body)).buffer;
  }
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.arrayBuffer();
}
