package com.flowlabs.rsstockw;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;

import java.io.PrintWriter;
import java.io.StringWriter;

/**
 * Proteção contra fechamentos:
 * - guarda o relatório de qualquer erro não tratado para mostrar na próxima abertura;
 * - se o app fechar logo depois de abrir, liga o "modo seguro" (sem GPU/efeitos pesados).
 */
final class CrashGuard {
    static final String KEY_REPORT = "crash_report";
    static final String KEY_SAFE = "safe_mode";
    static final String KEY_STARTED = "start_time";
    static final String KEY_FAST_CRASHES = "fast_crashes";

    private CrashGuard() {
    }

    static void install(final Context app) {
        final Thread.UncaughtExceptionHandler prev = Thread.getDefaultUncaughtExceptionHandler();
        Thread.setDefaultUncaughtExceptionHandler(new Thread.UncaughtExceptionHandler() {
            @Override
            public void uncaughtException(Thread t, Throwable e) {
                try {
                    StringWriter sw = new StringWriter();
                    e.printStackTrace(new PrintWriter(sw));
                    String report = "RS Stock " + version(app) + " · Android " + Build.VERSION.RELEASE + " (API " + Build.VERSION.SDK_INT + ") · "
                            + Build.MANUFACTURER + " " + Build.MODEL + "\nThread: " + t.getName() + "\n\n" + sw.toString();
                    if (report.length() > 6000) report = report.substring(0, 6000);
                    SharedPreferences p = Store.prefs(app);
                    long started = p.getLong(KEY_STARTED, 0);
                    int fast = p.getInt(KEY_FAST_CRASHES, 0);
                    boolean quick = started > 0 && System.currentTimeMillis() - started < 15000;
                    SharedPreferences.Editor ed = p.edit().putString(KEY_REPORT, report).putInt(KEY_FAST_CRASHES, quick ? fast + 1 : 0);
                    if (quick) ed.putBoolean(KEY_SAFE, true).putBoolean("gpu_render", false);
                    ed.commit();
                } catch (Throwable ignored) {
                }
                if (prev != null) prev.uncaughtException(t, e);
                else System.exit(2);
            }
        });
    }

    static void markStarted(Context c) {
        Store.prefs(c).edit().putLong(KEY_STARTED, System.currentTimeMillis()).apply();
    }

    /** Depois de 20 s aberto sem problemas, zera o contador de fechamentos rápidos. */
    static void markHealthy(Context c) {
        Store.prefs(c).edit().putInt(KEY_FAST_CRASHES, 0).apply();
    }

    static boolean safeMode(Context c) {
        return Store.prefs(c).getBoolean(KEY_SAFE, false);
    }

    static String version(Context c) {
        try {
            return c.getPackageManager().getPackageInfo(c.getPackageName(), 0).versionName;
        } catch (Exception e) {
            return "?";
        }
    }
}
