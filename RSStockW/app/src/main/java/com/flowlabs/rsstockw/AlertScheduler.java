package com.flowlabs.rsstockw;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import java.util.Calendar;

/** Agenda (ou cancela) a verificação diária de validades no horário escolhido pelo usuário. */
final class AlertScheduler {
    static final String ACTION_CHECK = "com.flowlabs.rsstockw.CHECK_EXPIRY";
    static final String ACTION_WEEKLY = "com.flowlabs.rsstockw.WEEKLY_SUMMARY";

    private AlertScheduler() {
    }

    private static PendingIntent pending(Context c) {
        return pending(c, ACTION_CHECK, 1001);
    }

    private static PendingIntent pending(Context c, String action, int code) {
        Intent i = new Intent(c, ExpiryReceiver.class);
        i.setAction(action);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 23) flags |= PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getBroadcast(c, code, i, flags);
    }

    /** Resumo semanal: no dia da semana e hora escolhidos (weeklyDay 0 = domingo ... 6 = sábado). */
    static void scheduleWeekly(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        PendingIntent pi = pending(c, ACTION_WEEKLY, 1002);
        am.cancel(pi);
        org.json.JSONObject s = Store.settings(c);
        if (!s.optBoolean("weekly", true)) return;
        int day = Math.max(0, Math.min(6, s.optInt("weeklyDay", 1)));
        int hour = Math.max(0, Math.min(23, s.optInt("weeklyHour", 9)));

        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.DAY_OF_WEEK, day + 1); // Calendar.SUNDAY = 1
        cal.set(Calendar.HOUR_OF_DAY, hour);
        cal.set(Calendar.MINUTE, 5);
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        while (cal.getTimeInMillis() <= System.currentTimeMillis()) cal.add(Calendar.DAY_OF_YEAR, 7);

        am.setInexactRepeating(AlarmManager.RTC_WAKEUP, cal.getTimeInMillis(), AlarmManager.INTERVAL_DAY * 7, pi);
    }

    static void schedule(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        try {
            scheduleWeekly(c);
        } catch (Throwable ignored) {
        }
        PendingIntent pi = pending(c);
        am.cancel(pi);

        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.HOUR_OF_DAY, Store.hour(c));
        cal.set(Calendar.MINUTE, Store.minute(c));
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        if (cal.getTimeInMillis() <= System.currentTimeMillis()) cal.add(Calendar.DAY_OF_YEAR, 1);

        am.setInexactRepeating(AlarmManager.RTC_WAKEUP, cal.getTimeInMillis(), AlarmManager.INTERVAL_DAY, pi);
    }
}
