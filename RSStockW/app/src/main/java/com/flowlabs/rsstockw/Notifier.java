package com.flowlabs.rsstockw;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

/** Calcula quais produtos precisam de alerta e publica a notificação. */
final class Notifier {
    static final String CHANNEL_ID = "expiry_alerts";
    static final int NOTIF_ID = 4242;
    static final String CHANNEL_WEEKLY = "weekly_summary";
    static final int WEEKLY_ID = 4243;

    private Notifier() {
    }

    static void createChannel(Context c) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        NotificationChannel ch = new NotificationChannel(CHANNEL_ID,
                c.getString(R.string.channel_alerts), NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription(c.getString(R.string.channel_alerts_desc));
        ch.enableLights(true);
        ch.setLightColor(Color.parseColor("#7C5CFF"));
        ch.enableVibration(true);
        nm.createNotificationChannel(ch);
        NotificationChannel wk = new NotificationChannel(CHANNEL_WEEKLY, "Resumo semanal", NotificationManager.IMPORTANCE_DEFAULT);
        wk.setDescription("Resumo da semana: vencidos, o que vence, perdas e rondas.");
        nm.createNotificationChannel(wk);
    }

    static boolean enabled(Context c) {
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return false;
        if (Build.VERSION.SDK_INT >= 24) return nm.areNotificationsEnabled();
        return true;
    }

    static final class Item {
        String name;
        String store;
        long days;
    }

    /** Dias entre hoje e a data "AAAA-MM-DD" (negativo = vencido). */
    static long daysUntil(String iso) {
        try {
            String[] p = iso.split("-");
            Calendar target = Calendar.getInstance();
            target.clear();
            target.set(Integer.parseInt(p[0]), Integer.parseInt(p[1]) - 1, Integer.parseInt(p[2]));
            Calendar today = Calendar.getInstance();
            Calendar t0 = Calendar.getInstance();
            t0.clear();
            t0.set(today.get(Calendar.YEAR), today.get(Calendar.MONTH), today.get(Calendar.DAY_OF_MONTH));
            return Math.round((target.getTimeInMillis() - t0.getTimeInMillis()) / 86400000.0);
        } catch (Exception e) {
            return Long.MAX_VALUE;
        }
    }

    static String label(long d) {
        if (d < -1) return "venceu há " + (-d) + " dias";
        if (d == -1) return "venceu ontem";
        if (d == 0) return "vence hoje";
        if (d == 1) return "vence amanhã";
        return "vence em " + d + " dias";
    }

    /**
     * @param test quando true, envia mesmo sem produtos (para o botão "Testar notificação").
     * @return quantidade de produtos incluídos no alerta.
     */
    static int checkAndNotify(Context c, boolean test) {
        JSONObject settings = Store.settings(c);
        if (!test && !settings.optBoolean("enabled", true)) return 0;
        if (!test) {
            // no máximo um alerta diário (o alarme inexato pode disparar mais de uma vez)
            String today = new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(new java.util.Date());
            if (today.equals(Store.prefs(c).getString(Store.KEY_LAST_NOTIFIED, ""))) return 0;
            Store.prefs(c).edit().putString(Store.KEY_LAST_NOTIFIED, today).apply();
        }
        int daysBefore = settings.optInt("daysBefore", 7);
        boolean includeExpired = settings.optBoolean("notifyExpired", true);

        JSONArray arr = Store.products(c);
        List<Item> items = new ArrayList<Item>();
        int expired = 0, today = 0, soon = 0;
        for (int i = 0; i < arr.length(); i++) {
            JSONObject o = arr.optJSONObject(i);
            if (o == null) continue;
            long d = daysUntil(o.optString("expiry", ""));
            if (d == Long.MAX_VALUE) continue;
            if (d < 0 && !includeExpired) continue;
            if (d > daysBefore) continue;
            Item it = new Item();
            it.name = o.optString("name", "Produto");
            it.store = o.optString("store", "");
            it.days = d;
            items.add(it);
            if (d < 0) expired++;
            else if (d == 0) today++;
            else soon++;
        }

        if (items.isEmpty() && !test) return 0;
        Collections.sort(items, new Comparator<Item>() {
            @Override
            public int compare(Item a, Item b) {
                return a.days < b.days ? -1 : (a.days == b.days ? 0 : 1);
            }
        });

        String title;
        StringBuilder summary = new StringBuilder();
        if (items.isEmpty()) {
            title = "Tudo em dia ✨";
            summary.append("As notificações do RS Stock estão funcionando.");
        } else {
            title = items.size() == 1 ? "1 produto precisa de atenção" : items.size() + " produtos precisam de atenção";
            if (expired > 0) summary.append(expired).append(expired == 1 ? " vencido" : " vencidos");
            if (today > 0) {
                if (summary.length() > 0) summary.append(" · ");
                summary.append(today).append(" vence hoje");
            }
            if (soon > 0) {
                if (summary.length() > 0) summary.append(" · ");
                summary.append(soon).append(soon == 1 ? " vence em breve" : " vencem em breve");
            }
        }

        Intent open = new Intent(c, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 23) flags |= PendingIntent.FLAG_IMMUTABLE;
        PendingIntent pi = PendingIntent.getActivity(c, 0, open, flags);

        Notification.Builder b = Build.VERSION.SDK_INT >= 26
                ? new Notification.Builder(c, CHANNEL_ID)
                : new Notification.Builder(c);
        b.setSmallIcon(R.drawable.ic_notify)
                .setContentTitle(title)
                .setContentText(summary.toString())
                .setColor(Color.parseColor("#7C5CFF"))
                .setAutoCancel(true)
                .setContentIntent(pi)
                .setCategory(Notification.CATEGORY_REMINDER)
                .setPriority(Notification.PRIORITY_HIGH)
                .setDefaults(Notification.DEFAULT_ALL);

        if (!items.isEmpty()) {
            Notification.InboxStyle style = new Notification.InboxStyle();
            int max = Math.min(items.size(), 6);
            for (int i = 0; i < max; i++) {
                Item it = items.get(i);
                style.addLine(it.name + " — " + label(it.days) + (it.store.length() > 0 ? " · " + it.store : ""));
            }
            if (items.size() > max) style.setSummaryText("+" + (items.size() - max) + " outros");
            style.setBigContentTitle(title);
            b.setStyle(style);
            b.setNumber(items.size());
        }

        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(NOTIF_ID, b.build());
        return items.size();
    }

    /** Resumo semanal automático: vencidos, o que vence em 7 dias, perdas da semana e rondas pendentes. */
    static int weekly(Context c, boolean test) {
        JSONObject settings = Store.settings(c);
        if (!test && !settings.optBoolean("weekly", true)) return 0;
        createChannel(c);
        JSONArray arr = Store.products(c);
        int expired = 0, week = 0, total = 0;
        List<Item> items = new ArrayList<Item>();
        for (int i = 0; i < arr.length(); i++) {
            JSONObject o = arr.optJSONObject(i);
            if (o == null) continue;
            long d = daysUntil(o.optString("expiry", ""));
            if (d == Long.MAX_VALUE) continue;
            total++;
            if (d < 0) expired++;
            else if (d <= 7) {
                week++;
                Item it = new Item();
                it.name = o.optString("name", "Produto");
                it.store = o.optString("store", "");
                it.days = d;
                items.add(it);
            }
        }
        Collections.sort(items, new Comparator<Item>() {
            @Override
            public int compare(Item a, Item b) {
                return a.days < b.days ? -1 : (a.days == b.days ? 0 : 1);
            }
        });
        double loss = settings.optDouble("weeklyLoss", 0);
        JSONArray pend = settings.optJSONArray("pendingRounds");
        boolean remind = settings.optBoolean("roundReminder", true);

        String title = "Resumo da semana · RS Stock";
        StringBuilder sb = new StringBuilder();
        sb.append(expired).append(expired == 1 ? " vencido" : " vencidos")
                .append(" · ").append(week).append(week == 1 ? " vence em 7 dias" : " vencem em 7 dias");
        String shortText = sb.toString();
        StringBuilder big = new StringBuilder(shortText);
        if (loss > 0) big.append("\n💸 Perdas na semana: R$ ").append(String.format(new java.util.Locale("pt", "BR"), "%.2f", loss));
        int max = Math.min(items.size(), 5);
        for (int i = 0; i < max; i++) {
            Item it = items.get(i);
            big.append("\n• ").append(it.name).append(" — ").append(label(it.days)).append(it.store.length() > 0 ? " · " + it.store : "");
        }
        if (items.size() > max) big.append("\n+").append(items.size() - max).append(" outros");
        if (remind && pend != null && pend.length() > 0) {
            big.append("\n✅ Ronda pendente: ");
            for (int i = 0; i < pend.length(); i++) big.append(i > 0 ? ", " : "").append(pend.optString(i));
        }
        if (total == 0) big.append("\nCadastre produtos para receber o resumo completo.");

        Intent open = new Intent(c, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        open.putExtra("open", "weekly");
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 23) flags |= PendingIntent.FLAG_IMMUTABLE;
        PendingIntent pi = PendingIntent.getActivity(c, 3, open, flags);

        Notification.Builder b = Build.VERSION.SDK_INT >= 26
                ? new Notification.Builder(c, CHANNEL_WEEKLY)
                : new Notification.Builder(c);
        b.setSmallIcon(R.drawable.ic_notify)
                .setContentTitle(title)
                .setContentText(shortText)
                .setStyle(new Notification.BigTextStyle().bigText(big.toString()).setBigContentTitle(title))
                .setColor(Color.parseColor("#10B981"))
                .setAutoCancel(true)
                .setContentIntent(pi)
                .setCategory(Notification.CATEGORY_REMINDER);
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(WEEKLY_ID, b.build());
        return 1;
    }
}
