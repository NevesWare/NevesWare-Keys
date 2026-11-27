package com.flowlabs.rsstock;

import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.graphics.pdf.PdfDocument;
import android.text.TextPaint;
import android.text.TextUtils;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;

/**
 * Relatório PDF (A4) com cabeçalho, resumo e tabela paginada de produtos.
 * Usa apenas android.graphics.pdf.PdfDocument — texto vetorial, leve e pesquisável.
 */
final class PdfExporter {
    private static final int W = 595, H = 842; // A4 em pontos
    private static final int M = 36;           // margem
    private static final int ROW_H = 30;
    private static final int FOOTER_H = 34;

    private PdfExporter() {
    }

    static int statusColor(String status) {
        if ("expired".equals(status)) return Color.parseColor("#E5484D");
        if ("today".equals(status)) return Color.parseColor("#F76B15");
        if ("soon".equals(status)) return Color.parseColor("#E2A336");
        return Color.parseColor("#12A594");
    }

    static String statusName(String status) {
        if ("expired".equals(status)) return "Vencido";
        if ("today".equals(status)) return "Vence hoje";
        if ("soon".equals(status)) return "Próximo";
        return "Em dia";
    }

    static byte[] build(android.content.Context ctx, JSONObject r) throws Exception {
        android.graphics.Bitmap logo = null;
        try {
            java.io.InputStream in = ctx.getAssets().open("www/img/logo.png");
            logo = android.graphics.BitmapFactory.decodeStream(in);
            in.close();
        } catch (Exception ignored) {
        }
        int accent;
        try {
            accent = Color.parseColor(r.optString("accent", "#7C5CFF"));
        } catch (Exception e) {
            accent = Color.parseColor("#7C5CFF");
        }
        JSONArray items = r.optJSONArray("items");
        if (items == null) items = new JSONArray();
        JSONObject cols = r.optJSONObject("columns");
        boolean showBarcode = cols == null || cols.optBoolean("barcode", true);
        boolean showCategory = cols == null || cols.optBoolean("category", true);
        boolean showQty = cols == null || cols.optBoolean("qty", true);

        // Colunas: Produto | Categoria | Qtd | Validade | Status
        int contentW = W - 2 * M;
        int wStatus = 82, wDate = 92, wQty = showQty ? 56 : 0, wCat = showCategory ? 96 : 0;
        int wName = contentW - wStatus - wDate - wQty - wCat;
        int xName = M, xCat = xName + wName, xQty = xCat + wCat, xDate = xQty + wQty, xStatus = xDate + wDate;

        int firstPageTop = 214;    // depois do cabeçalho + resumo
        int otherPageTop = 92;
        int rowsFirst = (H - FOOTER_H - M - firstPageTop) / ROW_H;
        int rowsOther = (H - FOOTER_H - M - otherPageTop) / ROW_H;
        int total = items.length();
        int pages = total <= rowsFirst ? 1 : 1 + (int) Math.ceil((total - rowsFirst) / (double) rowsOther);

        TextPaint title = text(22, Color.parseColor("#0E1020"), true);
        TextPaint sub = text(10, Color.parseColor("#6B6F80"), false);
        TextPaint head = text(8.5f, Color.parseColor("#6B6F80"), true);
        TextPaint cell = text(10, Color.parseColor("#151826"), false);
        TextPaint cellBold = text(10, Color.parseColor("#151826"), true);
        TextPaint small = text(8, Color.parseColor("#8A8FA3"), false);
        TextPaint pill = text(8, Color.WHITE, true);
        TextPaint white = text(9, Color.WHITE, true);
        Paint fill = new Paint(Paint.ANTI_ALIAS_FLAG);
        Paint line = new Paint(Paint.ANTI_ALIAS_FLAG);
        line.setColor(Color.parseColor("#E8EAF2"));
        line.setStrokeWidth(0.8f);

        PdfDocument doc = new PdfDocument();
        int index = 0;
        for (int p = 0; p < pages; p++) {
            PdfDocument.Page page = doc.startPage(new PdfDocument.PageInfo.Builder(W, H, p + 1).create());
            Canvas c = page.getCanvas();
            c.drawColor(Color.WHITE);

            int y;
            if (p == 0) {
                // Faixa de cor suave no topo
                fill.setShader(new LinearGradient(0, 0, W, 0, withAlpha(accent, 40), withAlpha(accent, 8), Shader.TileMode.CLAMP));
                c.drawRect(0, 0, W, 120, fill);
                fill.setShader(null);

                // Marca (ícone do app)
                if (logo != null) {
                    Paint bp = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG);
                    c.drawBitmap(logo, null, new RectF(M, 32, M + 32, 64), bp);
                } else {
                    fill.setColor(accent);
                    c.drawRoundRect(new RectF(M, 32, M + 32, 64), 9, 9, fill);
                    c.drawText("RS", M + 16 - white.measureText("RS") / 2, 52, white);
                }
                cellBold.setTextSize(12);
                c.drawText("RS Stock", M + 40, 47, cellBold);
                c.drawText("Flow Labs Studio", M + 40, 60, small);
                cellBold.setTextSize(10);

                String gen = r.optString("generatedAt", "");
                c.drawText(gen, W - M - sub.measureText(gen), 47, sub);
                String store = r.optString("store", "");
                if (store.length() > 0) c.drawText(store, W - M - small.measureText(store), 60, small);

                c.drawText(r.optString("title", "Relatório de validades"), M, 98, title);
                String subtitle = r.optString("subtitle", "");
                c.drawText(subtitle, M, 114, sub);

                // Resumo em cartões
                JSONObject s = r.optJSONObject("summary");
                if (s == null) s = new JSONObject();
                String[] labels = {"Produtos", "Vencidos", "Vencem hoje", "Próximos", "Em dia"};
                String[] keys = {"total", "expired", "today", "soon", "ok"};
                String[] st = {null, "expired", "today", "soon", "ok"};
                int gap = 8;
                float cw = (contentW - gap * 4) / 5f;
                for (int i = 0; i < 5; i++) {
                    float x = M + i * (cw + gap);
                    RectF box = new RectF(x, 134, x + cw, 184);
                    fill.setColor(Color.parseColor("#F5F6FA"));
                    c.drawRoundRect(box, 10, 10, fill);
                    int col = st[i] == null ? accent : statusColor(st[i]);
                    fill.setColor(col);
                    c.drawCircle(x + 12, 148, 3.5f, fill);
                    c.drawText(labels[i], x + 20, 151, small);
                    title.setTextSize(17);
                    c.drawText(String.valueOf(s.optInt(keys[i], 0)), x + 10, 176, title);
                    title.setTextSize(22);
                }
                y = firstPageTop;
            } else {
                cellBold.setTextSize(12);
                c.drawText("RS Stock", M, 50, cellBold);
                cellBold.setTextSize(10);
                String t = r.optString("title", "Relatório de validades");
                c.drawText(t, W - M - sub.measureText(t), 50, sub);
                c.drawLine(M, 62, W - M, 62, line);
                y = otherPageTop;
            }

            // Cabeçalho da tabela
            fill.setColor(Color.parseColor("#F5F6FA"));
            c.drawRoundRect(new RectF(M, y - 18, W - M, y + 4), 6, 6, fill);
            c.drawText("PRODUTO", xName + 8, y - 4, head);
            if (showCategory) c.drawText("CATEGORIA", xCat, y - 4, head);
            if (showQty) c.drawText("QTD", xQty, y - 4, head);
            c.drawText("VALIDADE", xDate, y - 4, head);
            c.drawText("STATUS", xStatus, y - 4, head);
            y += 8;

            int rows = p == 0 ? rowsFirst : rowsOther;
            for (int k = 0; k < rows && index < total; k++, index++) {
                JSONObject it = items.getJSONObject(index);
                String status = it.optString("status", "ok");
                int top = y;
                int base = top + 13;

                // marcador de status à esquerda
                fill.setColor(statusColor(status));
                c.drawRoundRect(new RectF(xName, top + 5, xName + 3, top + ROW_H - 7), 2, 2, fill);

                String bc = it.optString("barcode", "");
                boolean twoLines = showBarcode && bc.length() > 0;
                c.drawText(ellipsize(it.optString("name", ""), cellBold, wName - 18), xName + 10, twoLines ? base : base + 4, cellBold);
                if (twoLines) c.drawText(ellipsize(bc, small, wName - 18), xName + 10, base + 11, small);
                if (showCategory) c.drawText(ellipsize(it.optString("category", "—"), cell, wCat - 8), xCat, base + 4, cell);
                if (showQty) c.drawText(ellipsize(it.optString("qty", ""), cell, wQty - 6), xQty, base + 4, cell);
                c.drawText(it.optString("expiry", ""), xDate, base, cell);
                c.drawText(ellipsize(it.optString("label", ""), small, wDate - 6), xDate, base + 11, small);

                String sn = statusName(status);
                float pw = pill.measureText(sn) + 14;
                int col = statusColor(status);
                fill.setColor(withAlpha(col, 36));
                c.drawRoundRect(new RectF(xStatus, top + 7, xStatus + pw, top + 21), 7, 7, fill);
                pill.setColor(col);
                c.drawText(sn, xStatus + 7, top + 17.5f, pill);

                c.drawLine(M, top + ROW_H - 1, W - M, top + ROW_H - 1, line);
                y += ROW_H;
            }

            if (total == 0 && p == 0) {
                c.drawText("Nenhum produto para exibir com os filtros escolhidos.", M + 8, y + 20, sub);
            }

            // Rodapé
            String left = "Gerado pelo RS Stock · Flow Labs Studio";
            String right = "Página " + (p + 1) + " de " + pages;
            c.drawLine(M, H - FOOTER_H - 6, W - M, H - FOOTER_H - 6, line);
            c.drawText(left, M, H - FOOTER_H + 10, small);
            c.drawText(right, W - M - small.measureText(right), H - FOOTER_H + 10, small);

            doc.finishPage(page);
        }

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        doc.writeTo(out);
        doc.close();
        return out.toByteArray();
    }

    private static TextPaint text(float size, int color, boolean bold) {
        TextPaint p = new TextPaint(Paint.ANTI_ALIAS_FLAG);
        p.setTextSize(size);
        p.setColor(color);
        p.setTypeface(Typeface.create("sans-serif", bold ? Typeface.BOLD : Typeface.NORMAL));
        return p;
    }

    private static String ellipsize(String s, TextPaint p, float width) {
        if (s == null) return "";
        return TextUtils.ellipsize(s, p, Math.max(10, width), TextUtils.TruncateAt.END).toString();
    }

    private static int withAlpha(int color, int alpha) {
        return Color.argb(alpha, Color.red(color), Color.green(color), Color.blue(color));
    }
}
