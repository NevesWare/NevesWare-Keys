package com.flowlabs.rsstockw;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.io.InputStream;
import java.io.OutputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * RS Stock W — FlowLabs Studio.
 *
 * Versão reconstruída para abrir em qualquer Android 5.0+:
 * - o WebView é criado em código dentro de try/catch (se o "Android System WebView" estiver
 *   faltando ou quebrado, aparece uma mensagem em vez de o app fechar);
 * - toda configuração opcional (tela cheia, notificações, alarme) roda protegida;
 * - sem troca de ícone, sem activity-alias e sem recursos específicos de versão.
 */
public class MainActivity extends Activity {

    static final String ORIGIN_HOST = "appassets.androidplatform.net";
    static final String START_URL = "https://" + ORIGIN_HOST + "/index.html";
    static final String PERM_POST_NOTIFICATIONS = "android.permission.POST_NOTIFICATIONS";

    static final int REQ_CAMERA = 11;
    static final int REQ_NOTIF = 12;
    static final int REQ_STORAGE = 13;
    static final int REQ_SAVE_DOC = 21;
    static final int REQ_FILE_CHOOSER = 22;

    WebView web;
    WebBridge bridge;
    FrameLayout root;

    private PermissionRequest pendingWebPermission;
    private ValueCallback<Uri[]> fileChooserCallback;
    byte[] pendingSaveBytes;
    String pendingSaveCallback;
    Runnable pendingStorageAction;
    String pendingStorageCallback;
    private String lastDeepLink = null;

    int insetTop = 0, insetBottom = 0;
    boolean immersive = false, darkUi = true;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        CrashGuard.install(getApplicationContext());
        CrashGuard.markStarted(this);
        super.onCreate(savedInstanceState);

        SharedPreferences prefs = Store.prefs(this);
        darkUi = prefs.getBoolean(Store.KEY_LAST_DARK, true);
        immersive = prefs.getBoolean(Store.KEY_IMMERSIVE, false) && !CrashGuard.safeMode(this);

        root = new FrameLayout(this);
        root.setBackgroundColor(darkUi ? Color.parseColor("#07080D") : Color.parseColor("#EEF1F7"));
        setContentView(root);

        try {
            web = new WebView(this);
        } catch (Throwable e) {
            web = null;
            showFatal("Não foi possível abrir a tela do app.",
                    "Atualize o “Android System WebView” e o “Google Chrome” pela Play Store e abra o app de novo.\n\n" + e);
            return;
        }
        root.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        web.setBackgroundColor(Color.TRANSPARENT);

        try {
            setupSystemUi();
        } catch (Throwable ignored) {
        }
        try {
            setupWebView();
        } catch (Throwable e) {
            showFatal("Erro ao preparar a tela.", String.valueOf(e));
            return;
        }
        try {
            Notifier.createChannel(this);
            AlertScheduler.schedule(this);
        } catch (Throwable ignored) {
        }

        web.loadUrl(START_URL);

        root.postDelayed(new Runnable() {
            @Override
            public void run() {
                CrashGuard.markHealthy(MainActivity.this);
            }
        }, 20000);
    }

    /** Tela nativa simples para erros graves (nunca fecha o app sozinho). */
    void showFatal(String title, String detail) {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER);
        int p = (int) (28 * getResources().getDisplayMetrics().density);
        box.setPadding(p, p, p, p);
        box.setBackgroundColor(Color.parseColor("#07080D"));
        TextView t = new TextView(this);
        t.setText(title);
        t.setTextColor(Color.WHITE);
        t.setTextSize(20);
        t.setGravity(Gravity.CENTER);
        TextView d = new TextView(this);
        d.setText(detail);
        d.setTextColor(Color.parseColor("#B0B3C0"));
        d.setTextSize(13);
        d.setGravity(Gravity.CENTER);
        d.setPadding(0, p / 2, 0, p);
        Button b = new Button(this);
        b.setText("Tentar de novo");
        b.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent i = getPackageManager().getLaunchIntentForPackage(getPackageName());
                finish();
                if (i != null) startActivity(i);
            }
        });
        box.addView(t);
        box.addView(d);
        box.addView(b);
        try {
            root.removeAllViews();
            root.addView(box, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        } catch (Throwable e) {
            setContentView(box);
        }
    }

    // ------------------------------------------------------------------ Barras do sistema

    private void setupSystemUi() {
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);
        applyUi();
        root.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
            @Override
            public WindowInsets onApplyWindowInsets(View v, WindowInsets insets) {
                try {
                    float d = getResources().getDisplayMetrics().density;
                    int top = insets.getSystemWindowInsetTop();
                    int bottom = insets.getSystemWindowInsetBottom();
                    if (Build.VERSION.SDK_INT >= 28 && insets.getDisplayCutout() != null) {
                        top = Math.max(top, insets.getDisplayCutout().getSafeInsetTop());
                    }
                    // teclado aberto: encolhe a área do app
                    boolean keyboard = bottom > 150 * d;
                    v.setPadding(0, 0, 0, keyboard ? bottom : 0);
                    insetTop = Math.round(top / d);
                    insetBottom = keyboard ? 0 : Math.round(bottom / d);
                    pushInsets();
                    js("window.App&&App.setKeyboard&&App.setKeyboard(" + (keyboard ? Math.round(bottom / d) : 0) + ")");
                } catch (Throwable ignored) {
                }
                return insets.consumeSystemWindowInsets();
            }
        });
    }

    /** Desenha atrás das barras (com recuos calculados) e, se ligado, esconde as barras (tela cheia). */
    void applyUi() {
        try {
            int flags = View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION;
            if (immersive) {
                flags |= View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY;
            }
            if (!darkUi) {
                if (Build.VERSION.SDK_INT >= 23) flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                if (Build.VERSION.SDK_INT >= 26) flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            }
            getWindow().getDecorView().setSystemUiVisibility(flags);
            if (root != null) root.requestApplyInsets();
        } catch (Throwable ignored) {
        }
    }

    void applySystemBarStyle(boolean dark) {
        darkUi = dark;
        applyUi();
        try {
            root.setBackgroundColor(dark ? Color.parseColor("#07080D") : Color.parseColor("#EEF1F7"));
        } catch (Throwable ignored) {
        }
        Store.prefs(this).edit().putBoolean(Store.KEY_LAST_DARK, dark).apply();
    }

    void setFullscreenMode(boolean on) {
        immersive = on && !CrashGuard.safeMode(this);
        Store.prefs(this).edit().putBoolean(Store.KEY_IMMERSIVE, on).apply();
        applyUi();
    }

    void pushInsets() {
        js("window.App&&App.setInsets&&App.setInsets(" + insetTop + "," + insetBottom + ")");
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus && immersive) applyUi();
    }

    // ------------------------------------------------------------------ WebView

    private void setupWebView() {
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setTextZoom(100);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);

        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        boolean gpu = Store.prefs(this).getBoolean("gpu_render", true) && !CrashGuard.safeMode(this);
        web.setLayerType(gpu ? View.LAYER_TYPE_HARDWARE : View.LAYER_TYPE_SOFTWARE, null);

        bridge = new WebBridge(this);
        web.addJavascriptInterface(bridge, "AndroidBridge");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (ORIGIN_HOST.equals(u.getHost())) return serveAsset(u.getPath());
                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (ORIGIN_HOST.equals(u.getHost())) return false;
                openExternal(u.toString());
                return true;
            }

            /** Motor do WebView parou (falta de memória/erro): mostra aviso em vez de fechar o app. */
            @Override
            public boolean onRenderProcessGone(WebView view, android.webkit.RenderProcessGoneDetail detail) {
                Store.prefs(MainActivity.this).edit().putBoolean(CrashGuard.KEY_SAFE, true).putBoolean("gpu_render", false)
                        .putString(CrashGuard.KEY_REPORT, "O motor de exibição (WebView) parou. O app vai abrir no modo compatível.").apply();
                try {
                    root.removeView(view);
                    view.destroy();
                } catch (Throwable ignored) {
                }
                web = null;
                showFatal("A tela do app parou.", "Toque em “Tentar de novo”. O app vai abrir no modo compatível (mais leve).");
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                pushInsets();
                deliverDeepLink(getIntent());
                try {
                    getWindow().setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(darkUi ? Color.parseColor("#07080D") : Color.parseColor("#EEF1F7")));
                } catch (Throwable ignored) {
                }
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        boolean wantsCamera = false;
                        for (String r : request.getResources()) {
                            if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r)) wantsCamera = true;
                        }
                        if (!wantsCamera) {
                            request.deny();
                            return;
                        }
                        if (hasPermission(Manifest.permission.CAMERA)) {
                            request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
                        } else {
                            pendingWebPermission = request;
                            requestPermissions(new String[]{Manifest.permission.CAMERA}, REQ_CAMERA);
                        }
                    }
                });
            }

            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileChooserCallback != null) fileChooserCallback.onReceiveValue(null);
                fileChooserCallback = callback;
                try {
                    Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                    i.addCategory(Intent.CATEGORY_OPENABLE);
                    i.setType("*/*");
                    startActivityForResult(i, REQ_FILE_CHOOSER);
                } catch (Exception e) {
                    fileChooserCallback = null;
                    return false;
                }
                return true;
            }
        });
    }

    private static final Map<String, String> MIME = new HashMap<String, String>();

    static {
        MIME.put("html", "text/html");
        MIME.put("css", "text/css");
        MIME.put("js", "application/javascript");
        MIME.put("json", "application/json");
        MIME.put("svg", "image/svg+xml");
        MIME.put("png", "image/png");
        MIME.put("jpg", "image/jpeg");
        MIME.put("webp", "image/webp");
        MIME.put("woff2", "font/woff2");
        MIME.put("ttf", "font/ttf");
    }

    private WebResourceResponse serveAsset(String path) {
        if (path == null || path.equals("/") || path.length() == 0) path = "/index.html";
        if (path.contains("..")) return null;
        String ext = path.substring(path.lastIndexOf('.') + 1).toLowerCase();
        String mime = MIME.containsKey(ext) ? MIME.get(ext) : "application/octet-stream";
        try {
            InputStream in = getAssets().open("www" + path);
            WebResourceResponse r = new WebResourceResponse(mime, "UTF-8", in);
            Map<String, String> headers = new HashMap<String, String>();
            headers.put("Cache-Control", "no-store");
            headers.put("Access-Control-Allow-Origin", "*");
            r.setResponseHeaders(headers);
            return r;
        } catch (Exception e) {
            return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", null, null);
        }
    }

    // ------------------------------------------------------------------ Utilidades

    void js(final String code) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    if (web != null) web.evaluateJavascript(code, null);
                } catch (Throwable ignored) {
                }
            }
        });
    }

    void callback(String cb, String jsonValue) {
        if (cb == null || cb.length() == 0) return;
        js("window.Native&&Native._resolve(" + Store.quote(cb) + "," + jsonValue + ")");
    }

    boolean hasPermission(String p) {
        return Build.VERSION.SDK_INT < 23 || checkSelfPermission(p) == PackageManager.PERMISSION_GRANTED;
    }

    void openExternal(String url) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (Exception ignored) {
        }
    }

    void startSaveDocument(byte[] data, String mime, String filename, String cb) {
        pendingSaveBytes = data;
        pendingSaveCallback = cb;
        Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        i.addCategory(Intent.CATEGORY_OPENABLE);
        i.setType(mime);
        i.putExtra(Intent.EXTRA_TITLE, filename);
        try {
            startActivityForResult(i, REQ_SAVE_DOC);
        } catch (Exception e) {
            pendingSaveBytes = null;
            callback(cb, "{\"ok\":false,\"error\":\"Nenhum app de arquivos disponível\"}");
        }
    }

    void withStoragePermission(Runnable action, String cb) {
        if (Build.VERSION.SDK_INT >= 29 || hasPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE)) {
            action.run();
            return;
        }
        pendingStorageAction = action;
        pendingStorageCallback = cb;
        requestPermissions(new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, REQ_STORAGE);
    }

    void requestNotificationPermission(String cb) {
        if (Build.VERSION.SDK_INT >= 33 && !hasPermission(PERM_POST_NOTIFICATIONS)) {
            bridge.pendingNotifCallback = cb;
            requestPermissions(new String[]{PERM_POST_NOTIFICATIONS}, REQ_NOTIF);
        } else {
            callback(cb, Notifier.enabled(this) ? "true" : "false");
        }
    }

    void deliverDeepLink(Intent intent) {
        if (intent == null) return;
        String open = intent.getStringExtra("open");
        if (open != null) {
            intent.removeExtra("open");
            // abre o resumo semanal quando o app já terminou de iniciar
            js("(function f(n){if(window.RS&&RS.weekly&&window.RS.app&&document.querySelector('.hotbar')){setTimeout(function(){RS.weekly.show()},600)}else if(n<40){setTimeout(function(){f(n+1)},250)}})(0)");
        }
        if (intent.getData() == null) return;
        String url = intent.getDataString();
        if (url == null || !url.startsWith("rsstockw://") || url.equals(lastDeepLink)) return;
        lastDeepLink = url;
        js("window.App&&App.onDeepLink&&App.onDeepLink(" + Store.quote(url) + ")");
    }

    // ------------------------------------------------------------------ Resultados / ciclo de vida

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        boolean granted = results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED;
        if (requestCode == REQ_CAMERA && pendingWebPermission != null) {
            if (granted) pendingWebPermission.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
            else pendingWebPermission.deny();
            pendingWebPermission = null;
        } else if (requestCode == REQ_NOTIF && bridge != null) {
            callback(bridge.pendingNotifCallback, granted ? "true" : "false");
            bridge.pendingNotifCallback = null;
        } else if (requestCode == REQ_STORAGE) {
            if (pendingStorageAction != null) pendingStorageAction.run();
            if (!granted) callback(pendingStorageCallback, "{\"ok\":false,\"error\":\"Permissão negada\"}");
            pendingStorageAction = null;
            pendingStorageCallback = null;
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == REQ_FILE_CHOOSER) {
            if (fileChooserCallback != null) {
                Uri[] result = null;
                if (resultCode == RESULT_OK && data != null && data.getData() != null) result = new Uri[]{data.getData()};
                fileChooserCallback.onReceiveValue(result);
                fileChooserCallback = null;
            }
            return;
        }
        if (requestCode == REQ_SAVE_DOC) {
            String cb = pendingSaveCallback;
            byte[] bytes = pendingSaveBytes;
            pendingSaveBytes = null;
            pendingSaveCallback = null;
            if (resultCode != RESULT_OK || data == null || data.getData() == null || bytes == null) {
                callback(cb, "{\"ok\":false,\"cancelled\":true}");
                return;
            }
            try {
                OutputStream out = getContentResolver().openOutputStream(data.getData());
                out.write(bytes);
                out.flush();
                out.close();
                callback(cb, "{\"ok\":true}");
            } catch (Exception e) {
                callback(cb, "{\"ok\":false,\"error\":" + Store.quote(String.valueOf(e.getMessage())) + "}");
            }
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        deliverDeepLink(intent);
    }

    @Override
    public void onBackPressed() {
        if (web == null) {
            super.onBackPressed();
            return;
        }
        try {
            web.evaluateJavascript("(window.App&&App.handleBack)?App.handleBack():false", new ValueCallback<String>() {
                @Override
                public void onReceiveValue(String value) {
                    if (!"true".equals(value)) moveTaskToBack(true);
                }
            });
        } catch (Throwable e) {
            moveTaskToBack(true);
        }
    }

    // ----- Troca de ícone segura: só com o app fora da tela -----
    private boolean openedExternal = false;
    private final android.os.Handler iconHandler = new android.os.Handler(android.os.Looper.getMainLooper());
    private final Runnable iconApply = new Runnable() {
        @Override
        public void run() {
            IconSwitcher.applyPending(getApplicationContext());
        }
    };

    @Override
    public void startActivityForResult(Intent intent, int requestCode, Bundle options) {
        openedExternal = true; // câmera, arquivos, compartilhar, instalar: não é "sair do app"
        super.startActivityForResult(intent, requestCode, options);
    }

    @Override
    protected void onStop() {
        super.onStop();
        try {
            if (!openedExternal && !isChangingConfigurations() && IconSwitcher.hasPending(this)) {
                // espera o WebView gravar os dados no disco antes (o launcher pode fechar o processo)
                iconHandler.removeCallbacks(iconApply);
                iconHandler.postDelayed(iconApply, 6000);
            }
        } catch (Throwable ignored) {
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        openedExternal = false;
        iconHandler.removeCallbacks(iconApply);
        if (web != null) {
            try {
                web.onResume();
            } catch (Throwable ignored) {
            }
            js("window.App&&App.onResume&&App.onResume()");
        }
    }

    @Override
    protected void onPause() {
        if (web != null) {
            try {
                web.onPause();
            } catch (Throwable ignored) {
            }
        }
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            try {
                web.removeJavascriptInterface("AndroidBridge");
                web.destroy();
            } catch (Throwable ignored) {
            }
            web = null;
        }
        super.onDestroy();
    }
}
