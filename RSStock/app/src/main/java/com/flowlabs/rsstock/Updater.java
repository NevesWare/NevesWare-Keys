package com.flowlabs.rsstock;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Baixa o APK publicado no painel admin (Supabase Storage) e abre o instalador do Android.
 * O progresso vai para App.onUpdateProgress(pct) no JavaScript.
 */
final class Updater {
    static final String FILE = "rsstock-update.apk";

    private Updater() {
    }

    static File file(MainActivity a) {
        return new File(ShareProvider.dir(a), FILE);
    }

    static void download(final MainActivity a, final String url, final String cb) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                HttpURLConnection c = null;
                try {
                    File out = file(a);
                    if (out.exists()) out.delete();
                    String current = url;
                    for (int i = 0; i < 5; i++) { // segue redirecionamentos
                        c = (HttpURLConnection) new URL(current).openConnection();
                        c.setInstanceFollowRedirects(true);
                        c.setConnectTimeout(20000);
                        c.setReadTimeout(30000);
                        int code = c.getResponseCode();
                        if (code >= 300 && code < 400 && c.getHeaderField("Location") != null) {
                            current = c.getHeaderField("Location");
                            c.disconnect();
                            continue;
                        }
                        if (code != 200) throw new Exception("HTTP " + code);
                        break;
                    }
                    long total = c.getContentLength();
                    InputStream in = c.getInputStream();
                    FileOutputStream fo = new FileOutputStream(out);
                    byte[] buf = new byte[64 * 1024];
                    long done = 0;
                    int n, lastPct = -1;
                    while ((n = in.read(buf)) > 0) {
                        fo.write(buf, 0, n);
                        done += n;
                        if (total > 0) {
                            int pct = (int) (done * 100 / total);
                            if (pct != lastPct) {
                                lastPct = pct;
                                a.js("window.App&&App.onUpdateProgress&&App.onUpdateProgress(" + pct + ")");
                            }
                        }
                    }
                    fo.close();
                    in.close();
                    a.runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            install(a, cb);
                        }
                    });
                } catch (final Exception e) {
                    a.callback(cb, "{\"ok\":false,\"error\":" + Store.quote(String.valueOf(e.getMessage())) + "}");
                } finally {
                    if (c != null) c.disconnect();
                }
            }
        }).start();
    }

    /** Abre o instalador. No Android 8+ pede permissão de "instalar apps desconhecidos" se faltar. */
    static void install(MainActivity a, String cb) {
        File f = file(a);
        if (!f.exists()) {
            a.callback(cb, "{\"ok\":false,\"error\":\"Arquivo não encontrado\"}");
            return;
        }
        if (Build.VERSION.SDK_INT >= 26 && !a.getPackageManager().canRequestPackageInstalls()) {
            try {
                Intent s = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + a.getPackageName()));
                a.startActivity(s);
            } catch (Exception ignored) {
            }
            a.callback(cb, "{\"ok\":false,\"needPermission\":true}");
            return;
        }
        try {
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setDataAndType(ShareProvider.uriFor(f), "application/vnd.android.package-archive");
            i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            a.startActivity(i);
            a.callback(cb, "{\"ok\":true}");
        } catch (Exception e) {
            a.callback(cb, "{\"ok\":false,\"error\":" + Store.quote(String.valueOf(e.getMessage())) + "}");
        }
    }
}
