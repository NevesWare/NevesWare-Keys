package com.flowlabs.rsstock;

import android.content.ComponentName;
import android.content.Context;
import android.content.pm.PackageManager;

/**
 * Alterna o ícone do app na tela inicial ativando um dos activity-alias do manifesto:
 * .LauncherDefault (ícone padrão) ou .LauncherCoca (ícone do tema Coca).
 */
final class IconSwitcher {
    static final String KEY = "app_icon";

    private IconSwitcher() {
    }

    static String current(Context c) {
        return Store.prefs(c).getString(KEY, "default");
    }

    static void apply(Context c, String name) {
        if (!"coca".equals(name)) name = "default";
        if (name.equals(current(c))) return;
        PackageManager pm = c.getPackageManager();
        String pkg = c.getPackageName();
        ComponentName def = new ComponentName(pkg, pkg + ".LauncherDefault");
        ComponentName coca = new ComponentName(pkg, pkg + ".LauncherCoca");
        boolean isCoca = "coca".equals(name);
        // Ativa o novo antes de desativar o antigo para o app nunca ficar sem ícone
        pm.setComponentEnabledSetting(isCoca ? coca : def, PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP);
        pm.setComponentEnabledSetting(isCoca ? def : coca, PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP);
        Store.prefs(c).edit().putString(KEY, name).apply();
    }
}
