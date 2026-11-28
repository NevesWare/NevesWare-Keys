package com.flowlabs.rsstockw;

import android.content.ComponentName;
import android.content.Context;
import android.content.pm.PackageManager;

/**
 * Troca do ícone do app na tela inicial (activity-alias). Independente do tema do app.
 *
 * Segurança (a troca automática antiga fazia o app fechar com ele aberto):
 *  - só troca quando o usuário escolhe, nunca sozinho;
 *  - a escolha fica PENDENTE e só é aplicada quando o app sai da tela (onStop),
 *    então se o launcher fechar o processo, nada se perde;
 *  - primeiro habilita o novo ícone e só depois desabilita os outros: nunca fica sem ícone.
 */
final class IconSwitcher {
    static final String[] NAMES = {"default", "dark", "light", "coca", "riosul"};
    private static final String[] ALIASES = {".IconDefault", ".IconDark", ".IconLight", ".IconCoca", ".IconRioSul"};
    private static final String KEY_PENDING = "icon_pending";

    private IconSwitcher() {
    }

    private static int index(String name) {
        for (int i = 0; i < NAMES.length; i++) if (NAMES[i].equals(name)) return i;
        return -1;
    }

    private static ComponentName comp(Context c, int i) {
        return new ComponentName(c.getPackageName(), c.getPackageName() + ALIASES[i]);
    }

    /** Ícone ativo agora na tela inicial. */
    static String current(Context c) {
        PackageManager pm = c.getPackageManager();
        for (int i = 0; i < NAMES.length; i++) {
            try {
                int st = pm.getComponentEnabledSetting(comp(c, i));
                boolean on = st == PackageManager.COMPONENT_ENABLED_STATE_ENABLED
                        || (st == PackageManager.COMPONENT_ENABLED_STATE_DEFAULT && i == 0);
                if (on) return NAMES[i];
            } catch (Throwable ignored) {
            }
        }
        return "default";
    }

    /** O escolhido (pendente, se ainda não aplicado). */
    static String chosen(Context c) {
        String p = Store.prefs(c).getString(KEY_PENDING, "");
        return p.length() > 0 ? p : current(c);
    }

    static boolean hasPending(Context c) {
        String p = Store.prefs(c).getString(KEY_PENDING, "");
        return p.length() > 0 && !p.equals(current(c));
    }

    static void choose(Context c, String name) {
        if (index(name) < 0) return;
        if (name.equals(current(c))) Store.prefs(c).edit().remove(KEY_PENDING).commit();
        else Store.prefs(c).edit().putString(KEY_PENDING, name).commit();
    }

    /** Aplica a escolha pendente. Chamado só com o app fora da tela. */
    static void applyPending(Context c) {
        try {
            String name = Store.prefs(c).getString(KEY_PENDING, "");
            int target = index(name);
            Store.prefs(c).edit().remove(KEY_PENDING).commit();
            if (target < 0 || name.equals(current(c))) return;
            PackageManager pm = c.getPackageManager();
            pm.setComponentEnabledSetting(comp(c, target), PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP);
            for (int i = 0; i < NAMES.length; i++) {
                if (i == target) continue;
                pm.setComponentEnabledSetting(comp(c, i), PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP);
            }
        } catch (Throwable ignored) {
        }
    }

    static ComponentName component(Context c, String name) {
        int i = index(name);
        return i < 0 ? null : comp(c, i);
    }

    static void enable(Context c, String name) {
        int i = index(name);
        if (i < 0) return;
        c.getPackageManager().setComponentEnabledSetting(comp(c, i), PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP);
    }

    /** Desativa os outros ícones (chamado já na tela nova, aberta pelo ícone escolhido). */
    static void disableOthers(Context c, String name) {
        int t = index(name);
        if (t < 0) return;
        PackageManager pm = c.getPackageManager();
        for (int i = 0; i < NAMES.length; i++) {
            if (i == t) continue;
            try {
                pm.setComponentEnabledSetting(comp(c, i), PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP);
            } catch (Throwable ignored) {
            }
        }
        Store.prefs(c).edit().remove("icon_pending").commit();
    }
}
