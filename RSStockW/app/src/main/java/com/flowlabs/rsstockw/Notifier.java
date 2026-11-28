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
        String expiry;
        String qty;
        long days;
    }

    static final long[] PATTERN = {0, 700, 250, 700, 250, 1200};

    /** Canal conforme o som/vibração escolhidos (no Android 8+ o canal não pode mudar depois de criado). */
    static String alertChannel(Context c, String sound, boolean vibrate) {
        String id = "rs_alert_" + sound + (vibrate ? "_v" : "");
        if (Build.VERSION.SDK_INT < 26) return id;
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null || nm.getNotificationChannel(id) != null) return id;
        String name = "alarm".equals(sound) ? "Alertas de validade (alarme)" : "silent".equals(sound) ? "Alertas de validade (silencioso)" : "Alertas de validade";
        NotificationChannel ch = new NotificationChannel(id, name, NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription(c.getString(R.string.channel_alerts_desc));
        ch.enableLights(true);
        ch.setLightColor(Color.parseColor("#FF3B4E"));
        ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        if ("silent".equals(sound)) {
            ch.setSound(null, null);
        } else {
            boolean alarm = "alarm".equals(sound);
            android.net.Uri uri = android.media.RingtoneManager.getDefaultUri(alarm ? android.media.RingtoneManager.TYPE_ALARM : android.media.RingtoneManager.TYPE_NOTIFICATION);
            if (uri == null) uri = android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_NOTIFICATION);
            android.media.AudioAttributes aa = new android.media.AudioAttributes.Builder()
                    .setUsage(alarm ? android.media.AudioAttributes.USAGE_ALARM : android.media.AudioAttributes.USAGE_NOTIFICATION)
                    .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build();
            ch.setSound(uri, aa);
        }
        ch.enableVibration(vibrate);
        if (vibrate) ch.setVibrationPattern(PATTERN);
        nm.createNotificationChannel(ch);
        return id;
    }

    static String ddmm(String iso) {
        try {
            String[] p = iso.split("-");
            return p[2] + "/" + p[1];
        } catch (Exception e) {
            return iso;
        }
    }

    static String line(Item it, boolean withStore) {
        return it.name + " — " + it.qty + " · " + label(it.days) + " (" + ddmm(it.expiry) + ")" + (withStore && it.store.length() > 0 ? " · " + it.store : "");
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
     * Alerta diário. Uma notificação por mercado ("Mercado X: Leite vence amanhã"), com som de
     * alarme ou de notificação, vibração e, se escolhido, tocando até abrir.
     * @param test quando true, envia mesmo sem produtos (botão "Testar notificação").
     * @return quantidade de produtos incluídos no alerta.
     */
    static int checkAndNotify(Context c, boolean test) {
        JSONObject settings = Store.settings(c);
        if (!test && !settings.optBoolean("enabled", true)) return 0;
        if (!test) {
            // no máximo um alerta por horário configurado (o alarme pode disparar mais de uma vez)
            String key = new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(new java.util.Date())
                    + "@" + settings.optInt("hour", 9) + ":" + settings.optInt("minute", 0);
            if (key.equals(Store.prefs(c).getString(Store.KEY_LAST_NOTIFIED, ""))) return 0;
            Store.prefs(c).edit().putString(Store.KEY_LAST_NOTIFIED, key).apply();
        }
        int daysBefore = settings.optInt("daysBefore", 7);
        boolean includeExpired = settings.optBoolean("notifyExpired", true);
        String sound = settings.optString("sound", "alarm");
        boolean vibrate = settings.optBoolean("vibrate", true);
        boolean insistent = settings.optBoolean("insistent", false);
        boolean perStore = settings.optBoolean("perStore", true);

        JSONArray arr = Store.products(c);
        List<Item> items = new ArrayList<Item>();
        for (int i = 0; i < arr.length(); i++) {
            JSONObject o = arr.optJSONObject(i);
            if (o == null) continue;
            long d = daysUntil(o.optString("expiry", ""));
            if (d == Long.MAX_VALUE) continue;
            if (d < 0 && !includeExpired) continue;
            if (d > daysBefore) continue;
            if (o.optDouble("quantity", 1) <= 0 && d < 0) continue; // vencido já zerado: não precisa avisar
            Item it = new Item();
            it.name = o.optString("name", "Produto");
            it.store = o.optString("store", "");
            it.expiry = o.optString("expiry", "");
            double q = o.optDouble("quantity", 0);
            it.qty = (q == Math.floor(q) ? String.valueOf((long) q) : String.valueOf(q)) + " " + o.optString("unit", "un");
            it.days = d;
            items.add(it);
        }
        Collections.sort(items, new Comparator<Item>() {
            @Override
            public int compare(Item a, Item b) {
                return a.days < b.days ? -1 : (a.days == b.days ? 0 : 1);
            }
        });

        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return 0;
        String channel = alertChannel(c, sound, vibrate);

        if (items.isEmpty()) {
            if (!test) return 0;
            Notification.Builder b = builder(c, channel, sound, vibrate);
            b.setContentTitle("Tudo em dia ✨").setContentText("As notificações do RS Stock estão funcionando — assim você será avisado.");
            nm.notify(NOTIF_ID, b.build());
            return 0;
        }

        // agrupa por mercado, na ordem do mais urgente
        java.util.LinkedHashMap<String, List<Item>> byStore = new java.util.LinkedHashMap<String, List<Item>>();
        for (Item it : items) {
            String k = perStore ? it.store : "";
            List<Item> l = byStore.get(k);
            if (l == null) {
                l = new ArrayList<Item>();
                byStore.put(k, l);
            }
            l.add(it);
        }
        boolean grouped = byStore.size() > 1 && Build.VERSION.SDK_INT >= 24;
        boolean first = true;
        for (java.util.Map.Entry<String, List<Item>> e : byStore.entrySet()) {
            String store = e.getKey();
            List<Item> l = e.getValue();
            Item top = l.get(0);
            int expired = 0;
            for (Item it : l) if (it.days < 0) expired++;
            String where = store.length() > 0 ? store : "Seu estoque";
            String title;
            if (l.size() == 1) {
                title = "🏪 " + where + ": " + top.name + " " + label(top.days);
            } else {
                title = "🏪 " + where + " · " + l.size() + " produtos" + (expired > 0 ? " (" + expired + (expired == 1 ? " vencido)" : " vencidos)") : " vencendo");
            }
            Notification.Builder b = builder(c, channel, sound, vibrate);
            b.setContentTitle(title).setContentText(l.size() == 1 ? top.qty + " · validade " + ddmm(top.expiry) : line(top, !perStore));
            Notification.InboxStyle style = new Notification.InboxStyle();
            int max = Math.min(l.size(), 7);
            for (int i = 0; i < max; i++) style.addLine(line(l.get(i), !perStore));
            if (l.size() > max) style.setSummaryText("+" + (l.size() - max) + " outros");
            style.setBigContentTitle(title);
            b.setStyle(style).setNumber(l.size());
            if (grouped) {
                b.setGroup("rs_alerts");
                if (Build.VERSION.SDK_INT >= 26) b.setGroupAlertBehavior(Notification.GROUP_ALERT_SUMMARY);
            }
            Notification n = b.build();
            if (insistent && first && !grouped) n.flags |= Notification.FLAG_INSISTENT;
            nm.notify(5000 + (where.hashCode() & 0xFFF), n);
            first = false;
        }
        if (grouped) {
            Notification.Builder sb = builder(c, channel, sound, vibrate);
            sb.setContentTitle(items.size() + " produtos precisam de atenção")
                    .setContentText(byStore.size() + " mercados")
                    .setGroup("rs_alerts").setGroupSummary(true);
            Notification n = sb.build();
            if (insistent) n.flags |= Notification.FLAG_INSISTENT;
            nm.notify(NOTIF_ID, n);
        }
        if (vibrate) buzz(c);
        return items.size();
    }

    private static Notification.Builder builder(Context c, String channel, String sound, boolean vibrate) {
        Intent open = new Intent(c, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 23) flags |= PendingIntent.FLAG_IMMUTABLE;
        PendingIntent pi = PendingIntent.getActivity(c, 0, open, flags);
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, channel) : new Notification.Builder(c);
        b.setSmallIcon(R.drawable.ic_notify)
                .setColor(Color.parseColor("#FF3B4E"))
                .setAutoCancel(true)
                .setContentIntent(pi)
                .setShowWhen(true)
                .setCategory("alarm".equals(sound) ? Notification.CATEGORY_ALARM : Notification.CATEGORY_REMINDER)
                .setPriority(Notification.PRIORITY_MAX)
                .setVisibility(Notification.VISIBILITY_PUBLIC);
        if (Build.VERSION.SDK_INT < 26) {
            if ("silent".equals(sound)) {
                b.setDefaults(Notification.DEFAULT_LIGHTS);
            } else {
                boolean alarm = "alarm".equals(sound);
                android.net.Uri uri = android.media.RingtoneManager.getDefaultUri(alarm ? android.media.RingtoneManager.TYPE_ALARM : android.media.RingtoneManager.TYPE_NOTIFICATION);
                if (uri == null) uri = android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_NOTIFICATION);
                b.setSound(uri, alarm ? android.media.AudioManager.STREAM_ALARM : android.media.AudioManager.STREAM_NOTIFICATION);
                b.setDefaults(Notification.DEFAULT_LIGHTS);
            }
            if (vibrate) b.setVibrate(PATTERN);
        }
        return b;
    }

    /** Vibração extra direta (alguns aparelhos não vibram pelo canal no modo normal). */
    private static void buzz(Context c) {
        try {
            android.os.Vibrator v = (android.os.Vibrator) c.getSystemService(Context.VIBRATOR_SERVICE);
            if (v == null || !v.hasVibrator()) return;
            if (Build.VERSION.SDK_INT >= 26) v.vibrate(android.os.VibrationEffect.createWaveform(PATTERN, -1));
            else v.vibrate(PATTERN, -1);
        } catch (Throwable ignored) {
        }
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
