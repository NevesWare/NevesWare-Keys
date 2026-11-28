package com.flowlabs.rsstockw;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Recebe o alarme diário (verifica validades) e o boot do aparelho (reagenda). */
public class ExpiryReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent == null ? null : intent.getAction();
        if (AlertScheduler.ACTION_CHECK.equals(action)) {
            Notifier.checkAndNotify(context, false);
        } else {
            AlertScheduler.schedule(context);
        }
    }
}
