"""Invoice PDF generator using reportlab.

Produces a branded, GST-compliant invoice for Aakash Drycleaners.
"""
from __future__ import annotations

from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)

BRAND = colors.HexColor("#0C5E48")
BG = colors.HexColor("#F4F3EF")
BORDER = colors.HexColor("#E2E0D8")
TEXT = colors.HexColor("#06291F")
MUTED = colors.HexColor("#4A6159")


def rupees(paise: int) -> str:
    return f"₹{paise/100:,.2f}"


def build_invoice_pdf(inv: dict, business: dict) -> bytes:
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=15 * mm, rightMargin=15 * mm,
        topMargin=15 * mm, bottomMargin=15 * mm,
        title=f"{inv['number']} · {business['name']}",
    )

    styles = getSampleStyleSheet()
    h1 = ParagraphStyle("h1", parent=styles["Heading1"],
                        textColor=BRAND, fontSize=22, leading=26, spaceAfter=2)
    small = ParagraphStyle("small", parent=styles["Normal"],
                           textColor=MUTED, fontSize=8, leading=11)
    body = ParagraphStyle("body", parent=styles["Normal"],
                          textColor=TEXT, fontSize=10, leading=13)
    label = ParagraphStyle("label", parent=styles["Normal"],
                           textColor=MUTED, fontSize=7, leading=9,
                           spaceAfter=2)

    story = []

    # Header
    header_tbl = Table([
        [
            Paragraph(f"<b>{business['name'].upper()}</b>", h1),
            Paragraph(
                f"<b>TAX INVOICE</b><br/>"
                f"<font color='#4A6159'>Invoice №</font> <b>{inv['number']}</b><br/>"
                f"<font color='#4A6159'>Order</font> <b>{inv['order_number']}</b>",
                body,
            ),
        ]
    ], colWidths=[110 * mm, 70 * mm])
    header_tbl.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LINEBELOW", (0, 0), (-1, 0), 1.5, BRAND),
    ]))
    story.append(header_tbl)
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        f"{business['address']}<br/>"
        f"GSTIN: <b>{business['gstin']}</b> · {business['phone']} · {business['email']}",
        small,
    ))
    story.append(Spacer(1, 10))

    # Billed to / dates
    meta_tbl = Table([
        [
            Paragraph("BILLED TO", label),
            Paragraph("INVOICE DATE", label),
            Paragraph("STATUS", label),
        ],
        [
            Paragraph(
                f"<b>{inv['client_name']}</b><br/>{inv['client_phone']}",
                body,
            ),
            Paragraph(inv["created_at"][:10], body),
            Paragraph(
                f"<b>{'PAID' if inv['status']=='paid' else 'PENDING'}</b>",
                ParagraphStyle(
                    "st", parent=body,
                    textColor=BRAND if inv["status"] == "paid" else colors.HexColor("#B45309"),
                ),
            ),
        ],
    ], colWidths=[80 * mm, 50 * mm, 50 * mm])
    meta_tbl.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("BACKGROUND", (0, 0), (-1, 0), BG),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("PADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(meta_tbl)
    story.append(Spacer(1, 12))

    # Items table
    rows = [["Garment", "Category", "Service", "Qty", "Rate", "Amount"]]
    for it in inv["items"]:
        rows.append([
            it["service_name"], it["category"], it["service_type"],
            str(it["quantity"]), rupees(it["rate_paise"]), rupees(it["total_paise"]),
        ])
    items_tbl = Table(rows, colWidths=[45 * mm, 30 * mm, 35 * mm, 15 * mm, 25 * mm, 30 * mm])
    items_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("TEXTCOLOR", (0, 1), (-1, -1), TEXT),
        ("ALIGN", (3, 0), (-1, -1), "RIGHT"),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, BORDER),
        ("PADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(items_tbl)
    story.append(Spacer(1, 10))

    # Totals
    tot_rows = [
        ["Subtotal", rupees(inv["subtotal_paise"])],
        ["CGST (9%)", rupees(inv["cgst_paise"])],
        ["SGST (9%)", rupees(inv["sgst_paise"])],
        ["", ""],
        ["Total", rupees(inv["total_paise"])],
    ]
    tot_tbl = Table(tot_rows, colWidths=[130 * mm, 50 * mm])
    tot_tbl.setStyle(TableStyle([
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TEXTCOLOR", (0, 0), (-1, -2), MUTED),
        ("TEXTCOLOR", (0, -1), (-1, -1), TEXT),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("LINEABOVE", (0, -1), (-1, -1), 1, BRAND),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(tot_tbl)
    story.append(Spacer(1, 22))

    # Footer
    story.append(Paragraph(
        "Thank you for choosing Aakash Drycleaners. "
        "For any concerns write to us at "
        f"<font color='#0C5E48'><b>{business['email']}</b></font>. "
        "Care instructions honoured with love; discrepancies logged and resolved within 24h.",
        small,
    ))

    doc.build(story)
    return buf.getvalue()
