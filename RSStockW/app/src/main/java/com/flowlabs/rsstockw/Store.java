package com.flowlabs.rsstockw;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Cópia nativa dos dados (produtos + configurações de notificação) para que o alarme
 * consiga verificar as validades mesmo com o app fechado. A fonte principal fica no
 * WebView (repositório local, futuramente Supabase) e é sincronizada a cada alteração.
 */
final class Store {
    static final String PREFS = "rsstockw";
    static final String KEY_PRODUCTS = "products_json";
    static final String KEY_SETTINGS = "notif_settings_json";
    static final String KEY_LAST_DARK = "last_theme_dark";
    static final String KEY_LAST_NOTIFIED = "last_notified_day";
    static final String KEY_IMMERSIVE = "immersive";

    private Store() {
    }

    static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static JSONArray products(Context c) {
        try {
            return new JSONArray(prefs(c).getString(KEY_PRODUCTS, "[]"));
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    static JSONObject settings(Context c) {
        try {
            return new JSONObject(prefs(c).getString(KEY_SETTINGS, "{}"));
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    static boolean notificationsOn(Context c) {
        return settings(c).optBoolean("enabled", true);
    }

    static int alertDays(Context c) {
        return settings(c).optInt("daysBefore", 7);
    }

    static int hour(Context c) {
        return settings(c).optInt("hour", 9);
    }

    static int minute(Context c) {
        return settings(c).optInt("minute", 0);
    }

    /** Escapa uma string para ser usada como literal JS/JSON. */
    static String quote(String s) {
        return JSONObject.quote(s == null ? "" : s);
    }
}
