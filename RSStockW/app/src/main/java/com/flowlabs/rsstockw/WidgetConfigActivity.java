package com.flowlabs.rsstockw;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.text.InputType;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;

/**
 * Configuração do widget "Vencendo": prazo (3, 7, 15, 30, 60, 90 dias ou outro) e loja.
 * Abre ao adicionar o widget e pela engrenagem ⚙ dele. Interface montada em código.
 */
public class WidgetConfigActivity extends Activity {

    private static final int[] PERIODS = {3, 7, 15, 30, 60, 90};
    private static final int ACCENT = 0xFF7C5CFF;

    private int widgetId = AppWidgetManager.INVALID_APPWIDGET_ID;
    private int days;
    private String store;
    private boolean expired;
    private final List<TextView> dayChips = new ArrayList<TextView>();
    private final List<TextView> storeRows = new ArrayList<TextView>();
    private final List<String> storeValues = new ArrayList<String>();
    private EditText custom;
    private TextView expiredRow;

    private int dp(float v) {
        return Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics()));
    }

    private GradientDrawable round(int color, float radius, int stroke) {
        GradientDrawable g = new GradientDrawable();
        g.setColor(color);
        g.setCornerRadius(dp(radius));
        if (stroke != 0) g.setStroke(dp(1.5f), stroke);
        return g;
    }

    private TextView label(String t, float size, int color, boolean bold) {
        TextView v = new TextView(this);
        v.setText(t);
        v.setTextSize(size);
        v.setTextColor(color);
        if (bold) v.setTypeface(Typeface.DEFAULT_BOLD);
        return v;
    }

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        setResult(RESULT_CANCELED);
        Intent in = getIntent();
        if (in != null && in.getExtras() != null) {
            widgetId = in.getExtras().getInt(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
        }
        if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish();
            return;
        }
        days = RSWidgetSoon.days(this, widgetId);
        store = RSWidgetSoon.store(this, widgetId);
        expired = RSWidgetSoon.showExpired(this, widgetId);
        try {
            setContentView(buildUi());
        } catch (Throwable t) {
            // em último caso salva o padrão e adiciona o widget assim mesmo
            RSWidgetSoon.save(this, widgetId, days, store, expired);
            finishOk();
        }
    }

    private List<String> stores() {
        LinkedHashSet<String> set = new LinkedHashSet<String>();
        JSONObject s = Store.settings(this);
        JSONArray names = s.optJSONArray("stores");
        if (names != null) for (int i = 0; i < names.length(); i++) if (names.optString(i).length() > 0) set.add(names.optString(i));
        JSONArray p = Store.products(this);
        for (int i = 0; i < p.length(); i++) {
            JSONObject o = p.optJSONObject(i);
            if (o != null && o.optString("store", "").length() > 0) set.add(o.optString("store", ""));
        }
        return new ArrayList<String>(set);
    }

    private View buildUi() {
        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(0xCC000000);
        scroll.setFillViewport(true);

        LinearLayout outer = new LinearLayout(this);
        outer.setGravity(Gravity.CENTER);
        outer.setPadding(dp(18), dp(28), dp(18), dp(28));
        scroll.addView(outer, new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dp(20), dp(20), dp(20), dp(18));
        card.setBackground(round(0xFF161827, 26, 0x33FFFFFF));
        outer.addView(card, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        card.addView(label("Widget “Vencendo”", 20, Color.WHITE, true));
        TextView sub = label("Mostra na tela inicial os produtos que vencem dentro do prazo, da loja que você escolher.", 13, 0xB3FFFFFF, false);
        sub.setPadding(0, dp(4), 0, dp(14));
        card.addView(sub);

        // ----- prazo -----
        card.addView(section("Mostrar produtos que vencem em até"));
        LinearLayout grid = new LinearLayout(this);
        grid.setOrientation(LinearLayout.VERTICAL);
        LinearLayout row = null;
        for (int i = 0; i < PERIODS.length; i++) {
            if (i % 3 == 0) {
                row = new LinearLayout(this);
                row.setOrientation(LinearLayout.HORIZONTAL);
                grid.addView(row);
            }
            final int d = PERIODS[i];
            TextView chip = label(RSWidgetSoon.periodLabel(d), 14, Color.WHITE, true);
            chip.setGravity(Gravity.CENTER);
            chip.setPadding(0, dp(11), 0, dp(11));
            chip.setTag(d);
            chip.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    days = d;
                    custom.setText("");
                    paint();
                }
            });
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1);
            lp.setMargins(dp(3), dp(3), dp(3), dp(3));
            row.addView(chip, lp);
            dayChips.add(chip);
        }
        card.addView(grid);
        custom = new EditText(this);
        custom.setHint("Outro prazo (dias)");
        custom.setHintTextColor(0x66FFFFFF);
        custom.setTextColor(Color.WHITE);
        custom.setInputType(InputType.TYPE_CLASS_NUMBER);
        custom.setBackground(round(0x14FFFFFF, 14, 0));
        custom.setPadding(dp(14), dp(10), dp(14), dp(10));
        boolean isPreset = false;
        for (int p : PERIODS) if (p == days) isPreset = true;
        if (!isPreset) custom.setText(String.valueOf(days));
        LinearLayout.LayoutParams clp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        clp.setMargins(dp(3), dp(6), dp(3), 0);
        card.addView(custom, clp);
        custom.addTextChangedListener(new android.text.TextWatcher() {
            public void beforeTextChanged(CharSequence s, int a, int b2, int c) {
            }

            public void onTextChanged(CharSequence s, int a, int b2, int c) {
            }

            public void afterTextChanged(android.text.Editable e) {
                try {
                    int v = Integer.parseInt(e.toString().trim());
                    if (v > 0 && v <= 3650) {
                        days = v;
                        paintChips();
                    }
                } catch (Exception ignored) {
                }
            }
        });

        // ----- loja -----
        card.addView(section("Loja"));
        storeValues.add("");
        storeValues.addAll(stores());
        if (store.length() > 0 && !storeValues.contains(store)) storeValues.add(store);
        for (final String s : storeValues) {
            TextView r = label((s.length() == 0 ? "Todas as lojas" : s), 15, Color.WHITE, false);
            r.setPadding(dp(14), dp(13), dp(14), dp(13));
            r.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    store = s;
                    paint();
                }
            });
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            lp.setMargins(dp(3), dp(3), dp(3), dp(3));
            card.addView(r, lp);
            storeRows.add(r);
        }
        if (storeValues.size() == 1) {
            TextView hint = label("Abra o app uma vez para aparecerem suas lojas aqui.", 12, 0x99FFFFFF, false);
            hint.setPadding(dp(4), dp(4), 0, 0);
            card.addView(hint);
        }

        // ----- vencidos -----
        card.addView(section("Opções"));
        expiredRow = label("", 15, Color.WHITE, false);
        expiredRow.setPadding(dp(14), dp(13), dp(14), dp(13));
        expiredRow.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                expired = !expired;
                paint();
            }
        });
        LinearLayout.LayoutParams elp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        elp.setMargins(dp(3), dp(3), dp(3), dp(3));
        card.addView(expiredRow, elp);

        // ----- botões -----
        LinearLayout btns = new LinearLayout(this);
        btns.setOrientation(LinearLayout.HORIZONTAL);
        btns.setPadding(0, dp(18), 0, 0);
        TextView cancel = label("Cancelar", 15, 0xCCFFFFFF, true);
        cancel.setGravity(Gravity.CENTER);
        cancel.setPadding(0, dp(14), 0, dp(14));
        cancel.setBackground(round(0x14FFFFFF, 16, 0));
        cancel.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                finish();
            }
        });
        TextView ok = label("Salvar widget", 15, Color.WHITE, true);
        ok.setGravity(Gravity.CENTER);
        ok.setPadding(0, dp(14), 0, dp(14));
        ok.setBackground(round(ACCENT, 16, 0));
        ok.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                RSWidgetSoon.save(WidgetConfigActivity.this, widgetId, days, store, expired);
                finishOk();
            }
        });
        LinearLayout.LayoutParams b1 = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1);
        b1.setMargins(dp(3), 0, dp(5), 0);
        LinearLayout.LayoutParams b2 = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.4f);
        b2.setMargins(dp(5), 0, dp(3), 0);
        btns.addView(cancel, b1);
        btns.addView(ok, b2);
        card.addView(btns);

        paint();
        return scroll;
    }

    private TextView section(String t) {
        TextView v = label(t.toUpperCase(), 11, 0x80FFFFFF, true);
        v.setLetterSpacing(0.06f);
        v.setPadding(dp(4), dp(14), 0, dp(6));
        return v;
    }

    private void paintChips() {
        for (TextView c : dayChips) {
            boolean on = ((Integer) c.getTag()) == days;
            c.setBackground(round(on ? 0x337C5CFF : 0x14FFFFFF, 14, on ? ACCENT : 0));
            c.setTextColor(on ? 0xFFB9A8FF : Color.WHITE);
        }
    }

    private void paint() {
        paintChips();
        for (int i = 0; i < storeRows.size(); i++) {
            boolean on = storeValues.get(i).equals(store);
            TextView r = storeRows.get(i);
            String name = storeValues.get(i).length() == 0 ? "Todas as lojas" : storeValues.get(i);
            r.setText((on ? "●  " : "○  ") + name);
            r.setBackground(round(on ? 0x337C5CFF : 0x14FFFFFF, 14, on ? ACCENT : 0));
            r.setTypeface(on ? Typeface.DEFAULT_BOLD : Typeface.DEFAULT);
        }
        expiredRow.setText((expired ? "☑  " : "☐  ") + "Mostrar também os já vencidos");
        expiredRow.setBackground(round(0x14FFFFFF, 14, 0));
    }

    private void finishOk() {
        try {
            AppWidgetManager m = AppWidgetManager.getInstance(this);
            m.updateAppWidget(widgetId, RSWidgetSoon.build(this, widgetId));
        } catch (Throwable ignored) {
        }
        Intent r = new Intent();
        r.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId);
        setResult(RESULT_OK, r);
        finish();
    }
}
