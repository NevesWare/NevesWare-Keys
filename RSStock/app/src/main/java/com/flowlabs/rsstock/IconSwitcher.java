package com.flowlabs.rsstock;

import android.content.ComponentName;
import android.content.Context;
import android.content.pm.PackageManager;

/**
 * Alterna o ícone do app (activity-alias .LauncherDefault / .LauncherCoca).
 *
 * IMPORTANTE: trocar o alias com o app aberto faz o Android encerrar o app. Por isso o pedido
 * só é guardado (request) e a troca de verdade acontece quando o app vai para segundo plano
 * (applyPending, chamado no onStop). O ícone atual é lido do próprio Android, nunca de uma
 * anotação que possa ter se perdido — assim não existe ciclo de "abre e fecha".
 */
final class IconSwitcher {
    static final String KEY_WANTED = "app_icon_wanted";

    private IconSwitcher() {
    }

    private static ComponentName alias(Context c, String name) {
        String pkg = c.getPackageName();
        return new ComponentName(pkg, pkg + ("coca".equals(name) ? ".LauncherCoca" : ".LauncherDefault"));
    }

    private static boolean enabled(PackageManager pm, ComponentName cn, boolean defaultEnabled) {
        int st = pm.getComponentEnabledSetting(cn);
        if (st == PackageManager.COMPONENT_ENABLED_STATE_DEFAULT) return defaultEnabled;
        return st == PackageManager.COMPONENT_ENABLED_STATE_ENABLED;
    }

    /** Ícone que está de fato ativo no Android. */
    static String current(Context c) {
        try {
            PackageManager pm = c.getPackageManager();
            if (enabled(pm, alias(c, "coca"), false) && !enabled(pm, alias(c, "default"), true)) return "coca";
        } catch (Throwable ignored) {
        }
        return "default";
    }

    /** Só registra o desejo; não mexe em nada com o app aberto. */
    static void request(Context c, String name) {
        if (!"coca".equals(name)) name = "default";
        Store.prefs(c).edit().putString(KEY_WANTED, name).commit();
    }

    /** Aplica a troca pendente (chamado quando o app sai da tela). */
    static void applyPending(Context c) {
        try {
            String wanted = Store.prefs(c).getString(KEY_WANTED, null);
            if (wanted == null || wanted.equals(current(c))) return;
            PackageManager pm = c.getPackageManager();
            boolean coca = "coca".equals(wanted);
            // ativa o novo antes de desativar o antigo, para nunca ficar sem ícone
            pm.setComponentEnabledSetting(alias(c, wanted), PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP);
            pm.setComponentEnabledSetting(alias(c, coca ? "default" : "coca"),
                    coca ? PackageManager.COMPONENT_ENABLED_STATE_DISABLED : PackageManager.COMPONENT_ENABLED_STATE_DEFAULT,
                    PackageManager.DONT_KILL_APP);
            if (!coca) {
                pm.setComponentEnabledSetting(alias(c, "default"), PackageManager.COMPONENT_ENABLED_STATE_DEFAULT, PackageManager.DONT_KILL_APP);
                pm.setComponentEnabledSetting(alias(c, "coca"), PackageManager.COMPONENT_ENABLED_STATE_DEFAULT, PackageManager.DONT_KILL_APP);
            }
        } catch (Throwable ignored) {
        }
    }

    /** Compatibilidade com o código antigo. */
    static void apply(Context c, String name) {
        request(c, name);
    }
}
