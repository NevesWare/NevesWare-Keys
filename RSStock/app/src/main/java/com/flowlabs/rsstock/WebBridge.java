package com.flowlabs.rsstock;

import android.content.ContentValues;
import android.content.Intent;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.ArrayList;

/**
 * Ponte exposta ao JavaScript como window.AndroidBridge.
 * Métodos assíncronos recebem um "cb" (id do callback) e respondem via Native._resolve(cb, valor).
 */
public class WebBridge {
    private final MainActivity a;
    String pendingNotifCallback;

    WebBridge(MainActivity activity) {
        this.a = activity;
    }

    // ------------------------------------------------------------ Informações

    @JavascriptInterface
    public String info() {
        try {
            JSONObject o = new JSONObject();
            o.put("platform", "android");
            o.put("sdk", Build.VERSION.SDK_INT);
            android.content.pm.PackageInfo pi = a.getPackageManager().getPackageInfo(a.getPackageName(), 0);
            o.put("version", pi.versionName);
            o.put("versionCode", pi.versionCode);
            o.put("device", Build.MANUFACTURER + " " + Build.MODEL);
            o.put("insetTop", a.insetTop);
            o.put("insetBottom", a.insetBottom);
            o.put("immersive", a.immersive);
            o.put("notificationsAllowed", Notifier.enabled(a));
            return o.toString();
        } catch (Exception e) {
            return "{\"platform\":\"android\"}";
        }
    }

    // ------------------------------------------------------------ Dados / notificações

    /** Recebe a lista de produtos e as configurações de notificação e reagenda o alarme. */
    @JavascriptInterface
    public void sync(String productsJson, String notifSettingsJson) {
        Store.prefs(a).edit()
                .putString(Store.KEY_PRODUCTS, productsJson == null ? "[]" : productsJson)
                .putString(Store.KEY_SETTINGS, notifSettingsJson == null ? "{}" : notifSettingsJson)
                .apply();
        AlertScheduler.schedule(a);
    }

    @JavascriptInterface
    public int testNotification() {
        return Notifier.checkAndNotify(a, true);
    }

    @JavascriptInterface
    public void requestNotificationPermission(final String cb) {
        a.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                a.requestNotificationPermission(cb);
            }
        });
    }

    @JavascriptInterface
    public boolean notificationsAllowed() {
        return Notifier.enabled(a);
    }

    @JavascriptInterface
    public void openNotificationSettings() {
        try {
            Intent i;
            if (Build.VERSION.SDK_INT >= 26) {
                i = new Intent("android.settings.APP_NOTIFICATION_SETTINGS");
                i.putExtra("android.provider.extra.APP_PACKAGE", a.getPackageName());
            } else {
                i = new Intent("android.settings.APPLICATION_DETAILS_SETTINGS");
                i.setData(Uri.parse("package:" + a.getPackageName()));
            }
            a.startActivity(i);
        } catch (Exception ignored) {
        }
    }

    // ------------------------------------------------------------ Sistema / UI

    @JavascriptInterface
    public void setSystemBars(final boolean dark) {
        a.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                a.applySystemBarStyle(dark);
            }
        });
    }

    @JavascriptInterface
    public void setImmersive(final boolean on) {
        a.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                a.setFullscreenMode(on);
            }
        });
    }

    /** Baixa o APK da atualização e abre o instalador. */
    @JavascriptInterface
    public void downloadUpdate(String url, String cb) {
        Updater.download(a, url, cb);
    }

    /** Instala o APK já baixado (depois de o usuário liberar a permissão). */
    @JavascriptInterface
    public void installUpdate(final String cb) {
        a.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                Updater.install(a, cb);
            }
        });
    }

    @JavascriptInterface
    public String apkSha256() {
        return Updater.installedSha256(a);
    }

    @JavascriptInterface
    public boolean hasDownloadedUpdate() {
        return Updater.file(a).exists();
    }

    /** Troca o ícone da tela inicial: "default" ou "coca" (activity-alias). */
    @JavascriptInterface
    public void setAppIcon(String name) {
        IconSwitcher.apply(a, name);
    }

    @JavascriptInterface
    public String getAppIcon() {
        return IconSwitcher.current(a);
    }

    @JavascriptInterface
    public boolean isImmersive() {
        return a.immersive;
    }

    @JavascriptInterface
    public void vibrate(int ms) {
        try {
            Vibrator v = (Vibrator) a.getSystemService(android.content.Context.VIBRATOR_SERVICE);
            if (v == null || !v.hasVibrator()) return;
            if (Build.VERSION.SDK_INT >= 26) v.vibrate(VibrationEffect.createOneShot(Math.max(1, ms), VibrationEffect.DEFAULT_AMPLITUDE));
            else v.vibrate(ms);
        } catch (Exception ignored) {
        }
    }

    @JavascriptInterface
    public void openUrl(String url) {
        a.openExternal(url);
    }

    @JavascriptInterface
    public void exitApp() {
        a.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                a.moveTaskToBack(true);
            }
        });
    }

    // ------------------------------------------------------------ Exportação

    /** Compartilha texto puro (WhatsApp, e-mail, notas...). */
    @JavascriptInterface
    public void shareText(String text, String subject) {
        Intent i = new Intent(Intent.ACTION_SEND);
        i.setType("text/plain");
        i.putExtra(Intent.EXTRA_TEXT, text);
        if (subject != null) i.putExtra(Intent.EXTRA_SUBJECT, subject);
        a.startActivity(Intent.createChooser(i, "Compartilhar"));
    }

    /** Gera o PDF nativamente. mode = "share" ou "save". */
    @JavascriptInterface
    public void exportPdf(final String reportJson, final String filename, final String mode, final String cb) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    byte[] pdf = PdfExporter.build(a, new JSONObject(reportJson));
                    deliver(pdf, "application/pdf", filename, mode, cb);
                } catch (Exception e) {
                    fail(cb, e);
                }
            }
        }).start();
    }

    /** Arquivo genérico vindo do JS em base64 (imagem, texto, backup). */
    @JavascriptInterface
    public void exportFile(final String base64, final String mime, final String filename, final String mode, final String cb) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    deliver(decode(base64), mime, filename, mode, cb);
                } catch (Exception e) {
                    fail(cb, e);
                }
            }
        }).start();
    }

    /** Várias imagens (exportação longa dividida em páginas). */
    @JavascriptInterface
    public void exportImages(final String base64ArrayJson, final String baseName, final String mode, final String cb) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    JSONArray arr = new JSONArray(base64ArrayJson);
                    if ("gallery".equals(mode) || "save".equals(mode)) {
                        for (int i = 0; i < arr.length(); i++) {
                            String name = arr.length() == 1 ? baseName + ".png" : baseName + "-" + (i + 1) + ".png";
                            saveToGallerySync(decode(arr.getString(i)), name);
                        }
                        a.callback(cb, "{\"ok\":true,\"where\":\"gallery\"}");
                        return;
                    }
                    ArrayList<Uri> uris = new ArrayList<Uri>();
                    for (int i = 0; i < arr.length(); i++) {
                        String name = arr.length() == 1 ? baseName + ".png" : baseName + "-" + (i + 1) + ".png";
                        uris.add(ShareProvider.uriFor(writeCache(decode(arr.getString(i)), name)));
                    }
                    Intent i;
                    if (uris.size() == 1) {
                        i = new Intent(Intent.ACTION_SEND);
                        i.putExtra(Intent.EXTRA_STREAM, uris.get(0));
                    } else {
                        i = new Intent(Intent.ACTION_SEND_MULTIPLE);
                        i.putParcelableArrayListExtra(Intent.EXTRA_STREAM, uris);
                    }
                    i.setType("image/png");
                    i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    a.startActivity(Intent.createChooser(i, "Compartilhar imagem"));
                    a.callback(cb, "{\"ok\":true,\"where\":\"share\"}");
                } catch (Exception e) {
                    fail(cb, e);
                }
            }
        }).start();
    }

    // ------------------------------------------------------------ Internos

    private static byte[] decode(String b64) {
        int comma = b64.indexOf(',');
        if (b64.startsWith("data:") && comma > 0) b64 = b64.substring(comma + 1);
        return Base64.decode(b64, Base64.DEFAULT);
    }

    private File writeCache(byte[] data, String filename) throws Exception {
        File f = new File(ShareProvider.dir(a), safeName(filename));
        FileOutputStream out = new FileOutputStream(f);
        out.write(data);
        out.close();
        return f;
    }

    private static String safeName(String n) {
        if (n == null || n.length() == 0) n = "rsstock";
        return n.replaceAll("[^A-Za-z0-9._-]", "_");
    }

    private void deliver(final byte[] data, final String mime, final String filename, String mode, final String cb) throws Exception {
        if ("save".equals(mode)) {
            a.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    a.startSaveDocument(data, mime, safeName(filename), cb);
                }
            });
            return;
        }
        if ("gallery".equals(mode)) {
            saveToGallerySync(data, filename);
            a.callback(cb, "{\"ok\":true,\"where\":\"gallery\"}");
            return;
        }
        File f = writeCache(data, filename);
        Intent i = new Intent(Intent.ACTION_SEND);
        i.setType(mime);
        i.putExtra(Intent.EXTRA_STREAM, ShareProvider.uriFor(f));
        i.putExtra(Intent.EXTRA_SUBJECT, filename);
        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        a.startActivity(Intent.createChooser(i, "Compartilhar"));
        a.callback(cb, "{\"ok\":true,\"where\":\"share\"}");
    }

    /** Salva PNG em Imagens/RS Stock. */
    private void saveToGallerySync(final byte[] data, final String filename) throws Exception {
        if (Build.VERSION.SDK_INT >= 29) {
            ContentValues v = new ContentValues();
            v.put(MediaStore.MediaColumns.DISPLAY_NAME, safeName(filename));
            v.put(MediaStore.MediaColumns.MIME_TYPE, "image/png");
            v.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/RSStock");
            Uri uri = a.getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, v);
            if (uri == null) throw new Exception("Não foi possível criar o arquivo");
            OutputStream out = a.getContentResolver().openOutputStream(uri);
            out.write(data);
            out.close();
            return;
        }
        if (!a.hasPermission(android.Manifest.permission.WRITE_EXTERNAL_STORAGE)) {
            final Object lock = new Object();
            final boolean[] done = {false};
            a.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    a.withStoragePermission(new Runnable() {
                        @Override
                        public void run() {
                            synchronized (lock) {
                                done[0] = true;
                                lock.notifyAll();
                            }
                        }
                    }, null);
                }
            });
            synchronized (lock) {
                long until = System.currentTimeMillis() + 60000;
                while (!done[0] && System.currentTimeMillis() < until) lock.wait(500);
            }
            if (!a.hasPermission(android.Manifest.permission.WRITE_EXTERNAL_STORAGE)) {
                throw new Exception("Permissão de armazenamento negada");
            }
        }
        File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), "RSStock");
        if (!dir.exists()) dir.mkdirs();
        File f = new File(dir, safeName(filename));
        FileOutputStream out = new FileOutputStream(f);
        out.write(data);
        out.close();
        MediaScannerConnection.scanFile(a, new String[]{f.getAbsolutePath()}, new String[]{"image/png"}, null);
    }

    private void fail(String cb, Exception e) {
        a.callback(cb, "{\"ok\":false,\"error\":" + Store.quote(String.valueOf(e.getMessage())) + "}");
    }
}
