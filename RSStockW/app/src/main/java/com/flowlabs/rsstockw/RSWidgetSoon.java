package com.flowlabs.rsstockw;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

/**
 * Widget "Vencendo": lista os produtos que vencem dentro do prazo escolhido (padrão 15 dias)
 * da loja escolhida (ou de todas). Cada widget colocado na tela tem a sua configuração,
 * definida ao adicionar e alterável pela engrenagem ⚙.
 */
public class RSWidgetSoon extends AppWidgetProvider {

    static final int DEFAULT_DAYS = 15;
    private static final int ROWS = 6;
    private static final int[] ROW = {R.id.s_row0, R.id.s_row1, R.id.s_row2, R.id.s_row3, R.id.s_row4, R.id.s_row5};
    private static final int[] DOT = {R.id.s_dot0, R.id.s_dot1, R.id.s_dot2, R.id.s_dot3, R.id.s_dot4, R.id.s_dot5};
    private static final int[] NAME = {R.id.s_name0, R.id.s_name1, R.id.s_name2, R.id.s_name3, R.id.s_name4, R.id.s_name5};
    private static final int[] META = {R.id.s_meta0, R.id.s_meta1, R.id.s_meta2, R.id.s_meta3, R.id.s_meta4, R.id.s_meta5};
    private static final int[] WHEN = {R.id.s_when0, R.id.s_when1, R.id.s_when2, R.id.s_when3, R.id.s_when4, R.id.s_when5};

    // ---------- configuração por widget ----------
    static int days(Context c, int id) {
        return Store.prefs(c).getInt("wsoon_days_" + id, DEFAULT_DAYS);
    }

    /** Nome da loja; "" = todas as lojas. */
    static String store(Context c, int id) {
        return Store.prefs(c).getString("wsoon_store_" + id, "");
    }

    static boolean showExpired(Context c, int id) {
        return Store.prefs(c).getBoolean("wsoon_exp_" + id, true);
    }

    static void save(Context c, int id, int days, String store, boolean expired) {
        Store.prefs(c).edit()
                .putInt("wsoon_days_" + id, days)
                .putString("wsoon_store_" + id, store == null ? "" : store)
                .putBoolean("wsoon_exp_" + id, expired)
                .apply();
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) {
            try {
                manager.updateAppWidget(id, build(context, id));
            } catch (Throwable ignored) {
            }
        }
    }

    @Override
    public void onDeleted(Context context, int[] ids) {
        SharedPreferences.Editor e = Store.prefs(context).edit();
        for (int id : ids) e.remove("wsoon_days_" + id).remove("wsoon_store_" + id).remove("wsoon_exp_" + id);
        e.apply();
    }

    static void updateAll(Context c) {
        try {
            AppWidgetManager m = AppWidgetManager.getInstance(c);
            if (m == null) return;
            int[] ids = m.getAppWidgetIds(new ComponentName(c, RSWidgetSoon.class));
            if (ids == null) return;
            for (int id : ids) m.updateAppWidget(id, build(c, id));
        } catch (Throwable ignored) {
        }
    }

    private static final class Row {
        String name;
        String meta;
        long days;
    }

    private static String when(long d) {
        if (d < 0) return "VENCIDO";
        if (d == 0) return "hoje";
        if (d == 1) return "amanhã";
        return d + " dias";
    }

    private static int color(long d) {
        if (d < 0) return 0xFFFFFFFF;
        if (d < 7) return 0xFFFF5A6A;
        if (d <= 30) return 0xFFFFC043;
        return 0xFF2ED3A0;
    }

    static String periodLabel(int days) {
        if (days % 30 == 0 && days >= 30) return days == 30 ? "1 mês" : (days / 30) + " meses";
        return days + (days == 1 ? " dia" : " dias");
    }

    static RemoteViews build(Context c, int widgetId) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_soon);
        int limit = days(c, widgetId);
        String store = store(c, widgetId);
        boolean withExpired = showExpired(c, widgetId);
        JSONArray arr = Store.products(c);

        List<Row> rows = new ArrayList<Row>();
        for (int i = 0; i < arr.length(); i++) {
            JSONObject o = arr.optJSONObject(i);
            if (o == null) continue;
            String st = o.optString("store", "");
            if (store.length() > 0 && !store.equals(st)) continue;
            long d = Notifier.daysUntil(o.optString("expiry", ""));
            if (d == Long.MAX_VALUE || d > limit) continue;
            if (d < 0 && (!withExpired || o.optDouble("quantity", 1) <= 0)) continue;
            Row r = new Row();
            r.name = o.optString("name", "Produto");
            double q = o.optDouble("quantity", 0);
            String qty = (q == Math.floor(q) ? String.valueOf((long) q) : String.valueOf(q)) + " " + o.optString("unit", "un");
            r.meta = qty + " · " + Notifier.ddmm(o.optString("expiry", "")) + (store.length() == 0 && st.length() > 0 ? " · " + st : "");
            r.days = d;
            rows.add(r);
        }
        Collections.sort(rows, new Comparator<Row>() {
            @Override
            public int compare(Row a, Row b) {
                return a.days < b.days ? -1 : (a.days == b.days ? 0 : 1);
            }
        });

        v.setTextViewText(R.id.s_title, "Vencendo em " + periodLabel(limit));
        v.setTextViewText(R.id.s_store, store.length() > 0 ? "🏪 " + store : "🏪 Todas as lojas");
        v.setTextViewText(R.id.s_count, String.valueOf(rows.size()));
        v.setViewVisibility(R.id.s_empty, rows.isEmpty() ? View.VISIBLE : View.GONE);
        if (rows.isEmpty()) {
            v.setTextViewText(R.id.s_empty, arr.length() == 0 ? "Abra o app para carregar o estoque" : "Nada vencendo em " + periodLabel(limit) + " ✨");
        }
        for (int i = 0; i < ROWS; i++) {
            if (i < rows.size()) {
                Row r = rows.get(i);
                v.setViewVisibility(ROW[i], View.VISIBLE);
                v.setTextViewText(NAME[i], r.name);
                v.setTextViewText(META[i], r.meta);
                v.setTextViewText(WHEN[i], when(r.days));
                v.setTextColor(WHEN[i], color(r.days));
                v.setInt(DOT[i], "setBackgroundColor", r.days < 0 ? 0xFF8A8F9C : color(r.days));
            } else {
                v.setViewVisibility(ROW[i], View.GONE);
            }
        }
        if (rows.size() > ROWS) {
            v.setViewVisibility(R.id.s_more, View.VISIBLE);
            v.setTextViewText(R.id.s_more, "+" + (rows.size() - ROWS) + " outros · toque para ver no app");
        } else {
            v.setViewVisibility(R.id.s_more, View.GONE);
        }

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 23) flags |= PendingIntent.FLAG_IMMUTABLE;
        Intent open = new Intent(c, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        v.setOnClickPendingIntent(R.id.s_root, PendingIntent.getActivity(c, 2000 + widgetId, open, flags));

        Intent cfg = new Intent(c, WidgetConfigActivity.class);
        cfg.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId);
        cfg.setAction("rs.widget.config." + widgetId); // ação única para não reaproveitar o PendingIntent de outro widget
        cfg.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        v.setOnClickPendingIntent(R.id.s_gear, PendingIntent.getActivity(c, 3000 + widgetId, cfg, flags));
        return v;
    }
}
