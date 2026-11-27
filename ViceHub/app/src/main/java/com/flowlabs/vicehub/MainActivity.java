package com.flowlabs.vicehub;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.PrintWriter;
import java.io.StringWriter;

/**
 * ViceHub: o app inteiro é a interface web em assets/www, aberta num WebView
 * em tela cheia e travada em retrato. O mesmo código vira o site depois.
 *
 * Proteções contra fechamento:
 *  - erros de Java ficam salvos em crash.txt e aparecem na próxima abertura;
 *  - se o processo do WebView cair (falta de memória), a tela é recriada em vez de fechar o app.
 */
public class MainActivity extends Activity {

    private static final String START_URL = "file:///android_asset/www/index.html";
    private static final String[] ICONS = { "Dark", "Vice", "Neon", "Gold", "White", "Ocean" };

    private FrameLayout root;
    private WebView web;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        installCrashLogger();
        super.onCreate(savedInstanceState);
        try {
            requestWindowFeature(Window.FEATURE_NO_TITLE);
            getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
            getWindow().setFlags(WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED, WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED);
        } catch (Exception ignored) { }

        root = new FrameLayout(this);
        root.setBackgroundColor(Color.parseColor("#050507"));
        setContentView(root);
        createWebView(savedInstanceState);
        hideSystemUi();
        showLastCrash();
    }

    private void createWebView(Bundle state) {
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#050507"));
        root.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setTextZoom(100);
        if (Build.VERSION.SDK_INT >= 17) s.setMediaPlaybackRequiresUserGesture(false);
        if (Build.VERSION.SDK_INT >= 16) {
            s.setAllowFileAccessFromFileURLs(true);
            s.setAllowUniversalAccessFromFileURLs(true);
        }
        if (Build.VERSION.SDK_INT >= 19) WebView.setWebContentsDebuggingEnabled(true);

        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new Client());
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        if (Build.VERSION.SDK_INT >= 17) web.addJavascriptInterface(new NativeBridge(), "VHNative");

        if (state != null && web.restoreState(state) != null) return;
        web.loadUrl(START_URL);
    }

    private class Client extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            // links da internet (Google Maps, Discord...) abrem fora do app
            if (url != null && (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("geo:") || url.startsWith("mailto:"))) {
                try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (Exception ignored) { }
                return true;
            }
            return false;
        }

        @Override
        public boolean onRenderProcessGone(WebView view, android.webkit.RenderProcessGoneDetail detail) {
            // Sem isto o Android fecha o app inteiro quando o WebView cai (Android 8+).
            try {
                root.removeView(web);
                web.destroy();
            } catch (Exception ignored) { }
            web = null;
            createWebView(null);
            return true;
        }
    }

    /** Ponte chamada pela interface web: window.VHNative.setIcon("vice") */
    private class NativeBridge {
        @JavascriptInterface
        public boolean setIcon(String name) {
            String want = null;
            for (String s : ICONS) if (s.equalsIgnoreCase(name)) want = s;
            if (want == null) return false;
            try {
                PackageManager pm = getPackageManager();
                for (String s : ICONS) {
                    ComponentName cn = new ComponentName(MainActivity.this, getPackageName() + ".Icon" + s);
                    pm.setComponentEnabledSetting(cn, s.equals(want) ? PackageManager.COMPONENT_ENABLED_STATE_ENABLED
                            : PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP);
                }
                return true;
            } catch (Exception e) {
                return false;
            }
        }

        @JavascriptInterface
        public String currentIcon() {
            try {
                PackageManager pm = getPackageManager();
                for (String s : ICONS) {
                    int st = pm.getComponentEnabledSetting(new ComponentName(MainActivity.this, getPackageName() + ".Icon" + s));
                    if (st == PackageManager.COMPONENT_ENABLED_STATE_ENABLED) return s.toLowerCase();
                }
            } catch (Exception ignored) { }
            return "dark";
        }

        @JavascriptInterface
        public void share(String text) {
            try {
                Intent i = new Intent(Intent.ACTION_SEND);
                i.setType("text/plain");
                i.putExtra(Intent.EXTRA_TEXT, text);
                startActivity(Intent.createChooser(i, "Compartilhar"));
            } catch (Exception ignored) { }
        }

        @JavascriptInterface
        public String version() { return "1.0"; }
    }

    /* ---------- registro de erros ---------- */

    private void installCrashLogger() {
        final Thread.UncaughtExceptionHandler prev = Thread.getDefaultUncaughtExceptionHandler();
        Thread.setDefaultUncaughtExceptionHandler(new Thread.UncaughtExceptionHandler() {
            @Override
            public void uncaughtException(Thread t, Throwable e) {
                try {
                    StringWriter sw = new StringWriter();
                    e.printStackTrace(new PrintWriter(sw));
                    String info = "Android " + Build.VERSION.RELEASE + " (API " + Build.VERSION.SDK_INT + ") · " + Build.MANUFACTURER + " " + Build.MODEL + "\n\n" + sw;
                    FileOutputStream out = new FileOutputStream(new File(getFilesDir(), "crash.txt"));
                    out.write(info.getBytes("UTF-8"));
                    out.close();
                } catch (Exception ignored) { }
                if (prev != null) prev.uncaughtException(t, e);
            }
        });
    }

    private void showLastCrash() {
        final File f = new File(getFilesDir(), "crash.txt");
        if (!f.exists()) return;
        try {
            FileInputStream in = new FileInputStream(f);
            byte[] buf = new byte[(int) Math.min(f.length(), 20000)];
            int n = in.read(buf);
            in.close();
            final String txt = new String(buf, 0, Math.max(n, 0), "UTF-8");
            f.delete();
            new AlertDialog.Builder(this)
                    .setTitle("O ViceHub fechou da última vez")
                    .setMessage("Copie este relatório e mande para o desenvolvedor:\n\n" + (txt.length() > 1500 ? txt.substring(0, 1500) + "…" : txt))
                    .setPositiveButton("Copiar", new DialogInterface.OnClickListener() {
                        public void onClick(DialogInterface d, int w) {
                            ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                            if (cm != null) cm.setPrimaryClip(ClipData.newPlainText("ViceHub crash", txt));
                        }
                    })
                    .setNegativeButton("Fechar", null)
                    .show();
        } catch (Exception ignored) { }
    }

    /* ---------- tela cheia, ciclo de vida ---------- */

    private void hideSystemUi() {
        if (Build.VERSION.SDK_INT >= 19) {
            getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemUi();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (web != null) web.saveState(outState);
    }

    @Override
    protected void onPause() { super.onPause(); if (web != null) web.onPause(); }

    @Override
    protected void onResume() { super.onResume(); if (web != null) web.onResume(); }

    @Override
    protected void onDestroy() {
        if (web != null) { root.removeView(web); web.destroy(); web = null; }
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        if (web == null || Build.VERSION.SDK_INT < 19) { super.onBackPressed(); return; }
        web.evaluateJavascript("window.ViceHub && window.ViceHub.back ? String(window.ViceHub.back()) : 'false'",
                new ValueCallback<String>() {
                    @Override
                    public void onReceiveValue(String handled) {
                        if (handled == null || !handled.contains("true")) MainActivity.super.onBackPressed();
                    }
                });
    }
}
