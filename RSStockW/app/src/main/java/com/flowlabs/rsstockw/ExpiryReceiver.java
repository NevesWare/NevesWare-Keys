package com.flowlabs.rsstockw;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Recebe o alarme diário (validades), o semanal (resumo) e o boot do aparelho (reagenda). Atualiza o widget. */
public class ExpiryReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent == null ? null : intent.getAction();
        try {
            if (AlertScheduler.ACTION_CHECK.equals(action)) {
                Notifier.checkAndNotify(context, false);
            } else if (AlertScheduler.ACTION_WEEKLY.equals(action)) {
                Notifier.weekly(context, false);
            }
            AlertScheduler.schedule(context); // próximo disparo (alarmes exatos não se repetem sozinhos)
        } catch (Throwable ignored) {
        }
        RSWidget.updateAll(context);
    }
}
