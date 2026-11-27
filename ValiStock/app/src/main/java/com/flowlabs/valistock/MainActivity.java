package com.flowlabs.valistock;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
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

import java.io.InputStream;
import java.io.OutputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * ValiStock — Flow Labs Studio.
 *
 * A interface é feita em HTML/CSS/JS (pasta assets/www) e roda dentro de um WebView
 * com origem segura (https://appassets.androidplatform.net). O lado nativo cuida de:
 * notificações, PDF, compartilhamento/salvamento de arquivos, câmera e barras do sistema.
 */
public class MainActivity extends Activity {

    static final String ORIGIN_HOST = "appassets.androidplatform.net";
    static final String START_URL = "https://" + ORIGIN_HOST + "/index.html";

    /** Constante do Android 13 escrita como texto para compilar com o SDK 29. */
    static final String PERM_POST_NOTIFICATIONS = "android.permission.POST_NOTIFICATIONS";

    static final int REQ_CAMERA = 11;
    static final int REQ_NOTIF = 12;
    static final int REQ_STORAGE = 13;
    static final int REQ_SAVE_DOC = 21;
    static final int REQ_FILE_CHOOSER = 22;

    WebView web;
    WebBridge bridge;

    private PermissionRequest pendingWebPermission;
    private ValueCallback<Uri[]> fileChooserCallback;

    /** Arquivo aguardando o usuário escolher onde salvar (ACTION_CREATE_DOCUMENT). */
    byte[] pendingSaveBytes;
    String pendingSaveCallback;
    /** Ação aguardando a permissão de armazenamento (Android 9 ou anterior). */
    Runnable pendingStorageAction;
    String pendingStorageCallback;

    int insetTop = 0, insetBottom = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        SharedPreferences prefs = getSharedPreferences(Store.PREFS, MODE_PRIVATE);
        boolean dark = prefs.getBoolean(Store.KEY_LAST_DARK, true);
        int bg = dark ? Color.parseColor("#07080D") : Color.parseColor("#EEF1F7");
        getWindow().setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(bg));
        findViewById(R.id.root).setBackgroundColor(bg);

        setupEdgeToEdge(dark);

        web = (WebView) findViewById(R.id.web);
        web.setBackgroundColor(bg);
        setupWebView();

        Notifier.createChannel(this);
        AlertScheduler.schedule(this);

        if (savedInstanceState != null) {
            web.restoreState(savedInstanceState);
        } else {
            web.loadUrl(START_URL);
        }
    }

    // ------------------------------------------------------------------ Sistema

    private void setupEdgeToEdge(boolean dark) {
        Window w = getWindow();
        w.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        w.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        w.setStatusBarColor(Color.TRANSPARENT);
        w.setNavigationBarColor(Color.TRANSPARENT);
        applySystemBarStyle(dark);

        View root = findViewById(R.id.root);
        root.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
            @Override
            public WindowInsets onApplyWindowInsets(View v, WindowInsets insets) {
                float d = getResources().getDisplayMetrics().density;
                insetTop = Math.round(insets.getSystemWindowInsetTop() / d);
                insetBottom = Math.round(insets.getSystemWindowInsetBottom() / d);
                // Teclado aberto: deixa o WebView encolher (adjustResize) e zera a margem inferior
                int keyboard = insets.getSystemWindowInsetBottom();
                boolean keyboardOpen = keyboard > 150 * d;
                v.setPadding(0, 0, 0, keyboardOpen ? keyboard : 0);
                if (keyboardOpen) insetBottom = 0;
                pushInsets();
                return insets.consumeSystemWindowInsets();
            }
        });
    }

    void applySystemBarStyle(final boolean dark) {
        int flags = View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION;
        if (!dark) {
            if (Build.VERSION.SDK_INT >= 23) flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            if (Build.VERSION.SDK_INT >= 26) flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        }
        getWindow().getDecorView().setSystemUiVisibility(flags);
        // Android 5/6 não suportam ícones escuros: usa um leve véu para manter contraste
        if (!dark && Build.VERSION.SDK_INT < 23) {
            getWindow().setStatusBarColor(0x33000000);
        }
        int bg = dark ? Color.parseColor("#07080D") : Color.parseColor("#EEF1F7");
        getWindow().setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(bg));
        View root = findViewById(R.id.root);
        if (root != null) root.setBackgroundColor(bg);
        getSharedPreferences(Store.PREFS, MODE_PRIVATE).edit().putBoolean(Store.KEY_LAST_DARK, dark).apply();
    }

    void pushInsets() {
        js("window.App&&App.setInsets&&App.setInsets(" + insetTop + "," + insetBottom + ")");
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
        s.setTextZoom(100); // o tamanho da fonte é controlado em Ajustes > Acessibilidade
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        if (Build.VERSION.SDK_INT >= 26) s.setSafeBrowsingEnabled(false);

        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setLayerType(View.LAYER_TYPE_HARDWARE, null);

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

            @Override
            public void onPageFinished(WebView view, String url) {
                pushInsets();
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
            headers.put("Cache-Control", "no-cache");
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
                if (web != null) web.evaluateJavascript(code, null);
            }
        });
    }

    /** Chama uma função JS de callback com um valor já em formato JSON. */
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

    // ------------------------------------------------------------------ Resultados

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        boolean granted = results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED;
        if (requestCode == REQ_CAMERA && pendingWebPermission != null) {
            if (granted) pendingWebPermission.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
            else pendingWebPermission.deny();
            pendingWebPermission = null;
        } else if (requestCode == REQ_NOTIF) {
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
                if (resultCode == RESULT_OK && data != null && data.getData() != null) {
                    result = new Uri[]{data.getData()};
                }
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
    public void onBackPressed() {
        if (web == null) {
            super.onBackPressed();
            return;
        }
        web.evaluateJavascript("(window.App&&App.handleBack)?App.handleBack():false", new ValueCallback<String>() {
            @Override
            public void onReceiveValue(String value) {
                if (!"true".equals(value)) moveTaskToBack(true);
            }
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) {
            web.onResume();
            js("window.App&&App.onResume&&App.onResume()");
        }
    }

    @Override
    protected void onPause() {
        if (web != null) web.onPause();
        super.onPause();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (web != null) web.saveState(outState);
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            web.removeJavascriptInterface("AndroidBridge");
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }
}
