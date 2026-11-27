package com.flowlabs.vicehub;

import android.app.Activity;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * ViceHub: o app inteiro é a interface web em assets/www,
 * aberta num WebView em tela cheia e travada em retrato.
 * O mesmo código vira o site depois.
 */
public class MainActivity extends Activity {

    private WebView web;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
                WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED);

        setContentView(R.layout.activity_main);
        web = (WebView) findViewById(R.id.web);
        web.setBackgroundColor(Color.parseColor("#0B0618"));

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        if (Build.VERSION.SDK_INT >= 17) {
            s.setMediaPlaybackRequiresUserGesture(false);
        }

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                // Links da internet (Google Maps, Discord...) abrem fora do app.
                if (url != null && (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("geo:"))) {
                    try {
                        startActivity(new android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(url)));
                    } catch (Exception e) { /* nenhum app para abrir o link */ }
                    return true;
                }
                return false;
            }
        });
        web.setWebChromeClient(new WebChromeClient());
        web.addJavascriptInterface(new NativeBridge(), "VHNative");
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);

        if (savedInstanceState != null) {
            web.restoreState(savedInstanceState);
        } else {
            web.loadUrl("file:///android_asset/www/index.html");
        }
        hideSystemUi();
    }

    /** Ícones disponíveis: cada um é um activity-alias no AndroidManifest. */
    private static final String[] ICONS = { "Dark", "Vice", "Neon", "Gold", "White", "Ocean" };

    /** Ponte chamada pela interface web: window.VHNative.setIcon("vice") */
    private class NativeBridge {
        @android.webkit.JavascriptInterface
        public boolean setIcon(String name) {
            String want = null;
            for (String s : ICONS) if (s.equalsIgnoreCase(name)) want = s;
            if (want == null) return false;
            android.content.pm.PackageManager pm = getPackageManager();
            for (String s : ICONS) {
                android.content.ComponentName cn = new android.content.ComponentName(MainActivity.this, getPackageName() + ".Icon" + s);
                pm.setComponentEnabledSetting(cn,
                        s.equals(want) ? android.content.pm.PackageManager.COMPONENT_ENABLED_STATE_ENABLED
                                       : android.content.pm.PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                        android.content.pm.PackageManager.DONT_KILL_APP);
            }
            return true;
        }

        @android.webkit.JavascriptInterface
        public String currentIcon() {
            android.content.pm.PackageManager pm = getPackageManager();
            for (String s : ICONS) {
                int st = pm.getComponentEnabledSetting(new android.content.ComponentName(MainActivity.this, getPackageName() + ".Icon" + s));
                if (st == android.content.pm.PackageManager.COMPONENT_ENABLED_STATE_ENABLED) return s.toLowerCase();
            }
            return "dark";
        }
    }

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
        web.saveState(outState);
    }

    @Override
    public void onBackPressed() {
        // Pergunta à interface se ela tem algo para fechar (painel, ficha, aba).
        if (Build.VERSION.SDK_INT >= 19) {
            web.evaluateJavascript("window.ViceHub && window.ViceHub.back ? String(window.ViceHub.back()) : 'false'",
                    new android.webkit.ValueCallback<String>() {
                        @Override
                        public void onReceiveValue(String handled) {
                            if (handled == null || !handled.contains("true")) {
                                MainActivity.super.onBackPressed();
                            }
                        }
                    });
        } else {
            super.onBackPressed();
        }
    }
}
