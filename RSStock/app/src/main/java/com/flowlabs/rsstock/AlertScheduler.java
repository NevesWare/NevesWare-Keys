package com.flowlabs.rsstock;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import java.util.Calendar;

/** Agenda (ou cancela) a verificação diária de validades no horário escolhido pelo usuário. */
final class AlertScheduler {
    static final String ACTION_CHECK = "com.flowlabs.rsstock.CHECK_EXPIRY";

    private AlertScheduler() {
    }

    private static PendingIntent pending(Context c) {
        Intent i = new Intent(c, ExpiryReceiver.class);
        i.setAction(ACTION_CHECK);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 23) flags |= PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getBroadcast(c, 1001, i, flags);
    }

    static void schedule(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        PendingIntent pi = pending(c);
        am.cancel(pi);
        if (!Store.notificationsOn(c)) return;

        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.HOUR_OF_DAY, Store.hour(c));
        cal.set(Calendar.MINUTE, Store.minute(c));
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        if (cal.getTimeInMillis() <= System.currentTimeMillis()) cal.add(Calendar.DAY_OF_YEAR, 1);

        am.setInexactRepeating(AlarmManager.RTC_WAKEUP, cal.getTimeInMillis(), AlarmManager.INTERVAL_DAY, pi);
    }
}
