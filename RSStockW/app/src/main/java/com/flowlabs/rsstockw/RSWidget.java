package com.flowlabs.rsstockw;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
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
 * Widget "Validades" da tela inicial: contagem por cor (vencidos, menos de 7 dias,
 * 7 a 30 dias, mais de 30) da loja aberta no app e os próximos 3 produtos a vencer.
 * Usa a cópia nativa dos dados (Store) — funciona com o app fechado.
 */
public class RSWidget extends AppWidgetProvider {

    private static final int[] N = {R.id.w_n0, R.id.w_n1, R.id.w_n2, R.id.w_n3};
    private static final int[] ROW = {R.id.w_row0, R.id.w_row1, R.id.w_row2};
    private static final int[] NAME = {R.id.w_name0, R.id.w_name1, R.id.w_name2};
    private static final int[] WHEN = {R.id.w_when0, R.id.w_when1, R.id.w_when2};

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) {
            try {
                manager.updateAppWidget(id, build(context));
            } catch (Throwable ignored) {
            }
        }
    }

    /** Atualiza todos os widgets colocados na tela (chamado a cada sincronização e no alarme diário). */
    static void updateAll(Context c) {
        RSWidgetSoon.updateAll(c);
        try {
            AppWidgetManager m = AppWidgetManager.getInstance(c);
            if (m == null) return;
            int[] ids = m.getAppWidgetIds(new ComponentName(c, RSWidget.class));
            if (ids == null || ids.length == 0) return;
            RemoteViews v = build(c);
            for (int id : ids) m.updateAppWidget(id, v);
        } catch (Throwable ignored) {
        }
    }

    private static final class Row {
        String name;
        long days;
    }

    private static String when(long d) {
        if (d < 0) return "VENCIDO";
        if (d == 0) return "hoje";
        if (d == 1) return "amanhã";
        if (d < 31) return d + " dias";
        if (d < 365) return (d / 30) + (d / 30 == 1 ? " mês" : " meses");
        return (d / 365) + (d / 365 == 1 ? " ano" : " anos");
    }

    private static int color(long d) {
        if (d < 0) return 0xFFFFFFFF;
        if (d < 7) return 0xFFFF5A6A;
        if (d <= 30) return 0xFFFFC043;
        return 0xFF2ED3A0;
    }

    static RemoteViews build(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_rs);
        JSONObject settings = Store.settings(c);
        String store = settings.optString("currentStore", "");
        JSONArray arr = Store.products(c);

        int[] counts = new int[4];
        List<Row> rows = new ArrayList<Row>();
        for (int i = 0; i < arr.length(); i++) {
            JSONObject o = arr.optJSONObject(i);
            if (o == null) continue;
            if (store.length() > 0 && !store.equals(o.optString("store", ""))) continue;
            long d = Notifier.daysUntil(o.optString("expiry", ""));
            if (d == Long.MAX_VALUE) continue;
            if (d < 0) counts[0]++;
            else if (d < 7) counts[1]++;
            else if (d <= 30) counts[2]++;
            else counts[3]++;
            Row r = new Row();
            r.name = o.optString("name", "Produto");
            r.days = d;
            rows.add(r);
        }
        Collections.sort(rows, new Comparator<Row>() {
            @Override
            public int compare(Row a, Row b) {
                return a.days < b.days ? -1 : (a.days == b.days ? 0 : 1);
            }
        });

        v.setTextViewText(R.id.w_store, store.length() > 0 ? store : "Todas as lojas");
        for (int i = 0; i < 4; i++) v.setTextViewText(N[i], String.valueOf(counts[i]));
        v.setViewVisibility(R.id.w_empty, rows.isEmpty() ? View.VISIBLE : View.GONE);
        if (rows.isEmpty()) {
            v.setTextViewText(R.id.w_empty, arr.length() == 0 ? "Abra o app para carregar o estoque" : "Nenhum produto nesta loja");
        }
        for (int i = 0; i < 3; i++) {
            if (i < rows.size()) {
                Row r = rows.get(i);
                v.setViewVisibility(ROW[i], View.VISIBLE);
                v.setTextViewText(NAME[i], r.name);
                v.setTextViewText(WHEN[i], when(r.days));
                v.setTextColor(WHEN[i], color(r.days));
            } else {
                v.setViewVisibility(ROW[i], View.GONE);
            }
        }

        Intent open = new Intent(c, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 23) flags |= PendingIntent.FLAG_IMMUTABLE;
        v.setOnClickPendingIntent(R.id.w_root, PendingIntent.getActivity(c, 77, open, flags));
        return v;
    }
}
