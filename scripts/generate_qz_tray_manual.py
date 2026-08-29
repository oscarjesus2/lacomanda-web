from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from PIL import Image as PilImage


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "src" / "assets" / "manuales"
OUTPUT = ASSETS / "manual-instalacion-configuracion-qz-tray.pdf"
ICON = ASSETS / "img" / "qz-tray-icono.png"
MENU = ASSETS / "img" / "qz-tray-menu-site-manager.png"
SITE_MANAGER = ASSETS / "img" / "qz-tray-site-manager-allowed.png"

PAGE_W, PAGE_H = A4
MARGIN_X = 15 * mm
MARGIN_TOP = 14 * mm
MARGIN_BOTTOM = 13 * mm

PRIMARY = colors.HexColor("#BF360C")
PRIMARY_DARK = colors.HexColor("#7A1900")
PRIMARY_BRIGHT = colors.HexColor("#E54B16")
INK = colors.HexColor("#2D1A0A")
MUTED = colors.HexColor("#725C4C")
CREAM = colors.HexColor("#FFF8F2")
WARM = colors.HexColor("#FFF0E5")
LINE = colors.HexColor("#E8D8CC")
SUCCESS = colors.HexColor("#2E7D32")
SUCCESS_SOFT = colors.HexColor("#EDF7EE")
WHITE = colors.white


TITLE = ParagraphStyle(
    "Title",
    fontName="Helvetica-Bold",
    fontSize=24,
    leading=28,
    textColor=WHITE,
    spaceAfter=2 * mm,
)
SUBTITLE = ParagraphStyle(
    "Subtitle",
    fontName="Helvetica",
    fontSize=10.5,
    leading=14,
    textColor=colors.HexColor("#FFE1D3"),
)
PILL = ParagraphStyle(
    "Pill",
    fontName="Helvetica-Bold",
    fontSize=7.6,
    leading=9,
    alignment=TA_CENTER,
    textColor=PRIMARY_DARK,
)
STEP_TITLE = ParagraphStyle(
    "StepTitle",
    fontName="Helvetica-Bold",
    fontSize=11.4,
    leading=14,
    textColor=INK,
    spaceAfter=1.3 * mm,
)
STEP_BODY = ParagraphStyle(
    "StepBody",
    fontName="Helvetica",
    fontSize=8.8,
    leading=12.1,
    textColor=INK,
)
IMAGE_CAPTION = ParagraphStyle(
    "ImageCaption",
    fontName="Helvetica-Bold",
    fontSize=7.4,
    leading=9.5,
    alignment=TA_CENTER,
    textColor=MUTED,
)
NOTE_TITLE = ParagraphStyle(
    "NoteTitle",
    fontName="Helvetica-Bold",
    fontSize=10,
    leading=12,
    textColor=SUCCESS,
    spaceAfter=1 * mm,
)
NOTE_BODY = ParagraphStyle(
    "NoteBody",
    fontName="Helvetica",
    fontSize=8.4,
    leading=11.5,
    textColor=INK,
)
FOOT = ParagraphStyle(
    "Foot",
    fontName="Helvetica",
    fontSize=7.2,
    leading=9.5,
    textColor=MUTED,
)
BADGE = ParagraphStyle(
    "Badge",
    fontName="Helvetica-Bold",
    fontSize=14,
    leading=16,
    alignment=TA_CENTER,
    textColor=WHITE,
)


def image_fit(path: Path, max_w: float, max_h: float) -> Image:
    with PilImage.open(path) as image:
        width, height = image.size
    ratio = min(max_w / width, max_h / height)
    return Image(str(path), width=width * ratio, height=height * ratio)


def badge(number: int | str) -> Table:
    result = Table([[Paragraph(str(number), BADGE)]], colWidths=[9 * mm], rowHeights=[9 * mm])
    result.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), PRIMARY),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )
    return result


def text_step(number: int, title: str, body: str) -> Table:
    result = Table(
        [[badge(number), [Paragraph(title, STEP_TITLE), Paragraph(body, STEP_BODY)]]],
        colWidths=[13 * mm, 147 * mm],
        hAlign="LEFT",
    )
    result.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), WHITE),
                ("BOX", (0, 0), (-1, -1), 0.7, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (0, 0), 3 * mm),
                ("RIGHTPADDING", (0, 0), (0, 0), 0),
                ("LEFTPADDING", (1, 0), (1, 0), 1.5 * mm),
                ("RIGHTPADDING", (1, 0), (1, 0), 4 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 3 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3 * mm),
            ]
        )
    )
    return result


def screenshot_card(number: str, image: Image, caption: str, width: float) -> Table:
    image_table = Table([[image]], colWidths=[width - 8 * mm])
    image_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F3F3F3")),
                ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#CFCFCF")),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 2 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 2 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 2 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2 * mm),
            ]
        )
    )
    result = Table(
        [[badge(number)], [image_table], [Paragraph(caption, IMAGE_CAPTION)]],
        colWidths=[width],
        hAlign="CENTER",
    )
    result.setStyle(
        TableStyle(
            [
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1.5 * mm),
            ]
        )
    )
    return result


def draw_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(CREAM)
    canvas.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    canvas.setFillColor(PRIMARY_DARK)
    canvas.rect(0, PAGE_H - 3 * mm, PAGE_W, 3 * mm, stroke=0, fill=1)
    canvas.setStrokeColor(LINE)
    canvas.line(MARGIN_X, 10 * mm, PAGE_W - MARGIN_X, 10 * mm)
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 6.8)
    canvas.drawString(MARGIN_X, 5.7 * mm, "LaComanda | Configuración rápida de impresión")
    canvas.drawRightString(PAGE_W - MARGIN_X, 5.7 * mm, "Agosto 2026")
    canvas.restoreState()


def build_story():
    hero = Table(
        [[
            [
                Paragraph("Imprime con QZ Tray<br/>en 3 pasos", TITLE),
                Paragraph("Instálalo una sola vez y deja este ordenador listo para imprimir desde LaComanda.", SUBTITLE),
            ],
            [
                Table([[Paragraph("GUÍA RÁPIDA", PILL)]], colWidths=[29 * mm], rowHeights=[8 * mm], style=TableStyle([
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FFD6C4")),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ])),
                Spacer(1, 3 * mm),
                Paragraph("Windows", ParagraphStyle("Platform", fontName="Helvetica-Bold", fontSize=12, leading=14, alignment=TA_CENTER, textColor=WHITE)),
            ],
        ]],
        colWidths=[122 * mm, 38 * mm],
    )
    hero.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), PRIMARY_DARK),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 7 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 7 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7 * mm),
                ("LINEBEFORE", (1, 0), (1, 0), 0.8, colors.HexColor("#D56743")),
            ]
        )
    )

    setup_visual = Table(
        [[
            screenshot_card(
                "A",
                image_fit(ICON, 16 * mm, 16 * mm),
                "Busca este icono en el <b>área de notificación de Windows</b>, abajo a la derecha junto al reloj. Si no lo ves, abre los iconos ocultos. Haz clic derecho.",
                45 * mm,
            ),
            screenshot_card(
                "B",
                image_fit(MENU, 51 * mm, 28 * mm),
                "En el menú elige <b>Advanced &gt; Site Manager...</b>",
                54 * mm,
            ),
            screenshot_card(
                "C",
                image_fit(SITE_MANAGER, 57 * mm, 52 * mm),
                "En <b>Allowed</b> pulsa <b>+</b>, elige <b>certificate.pem</b> y comprueba que LaComanda queda en la lista.",
                61 * mm,
            ),
        ]],
        colWidths=[48 * mm, 56 * mm, 64 * mm],
        hAlign="CENTER",
    )
    setup_visual.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), WHITE),
                ("BOX", (0, 0), (-1, -1), 0.7, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 2 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 2 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 3 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2 * mm),
            ]
        )
    )

    ready = Table(
        [[
            Paragraph("LISTO", ParagraphStyle("ReadyBadge", fontName="Helvetica-Bold", fontSize=10, leading=12, alignment=TA_CENTER, textColor=WHITE)),
            [
                Paragraph("Vuelve a Ventas y haz una prueba", NOTE_TITLE),
                Paragraph("Cierra y abre QZ Tray, actualiza LaComanda y entra en <b>Ventas</b>. Si pide permiso, marca <b>Remember this decision</b> y pulsa <b>Allow</b>.", NOTE_BODY),
            ],
        ]],
        colWidths=[20 * mm, 140 * mm],
        hAlign="LEFT",
    )
    ready.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), SUCCESS_SOFT),
                ("BACKGROUND", (0, 0), (0, 0), SUCCESS),
                ("BOX", (0, 0), (-1, -1), 0.8, SUCCESS),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 3.5 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5 * mm),
            ]
        )
    )

    notes = Table(
        [[
            [Paragraph("Déjalo abierto", STEP_TITLE), Paragraph("QZ Tray debe seguir ejecutándose durante la jornada para que LaComanda pueda imprimir.", STEP_BODY)],
            [Paragraph("¿No funciona?", STEP_TITLE), Paragraph("Revisa que LaComanda no esté en <b>Blocked</b>. Reinicia QZ Tray y actualiza el navegador. Si continúa, crea un ticket con el mensaje exacto.", STEP_BODY)],
        ]],
        colWidths=[80 * mm, 80 * mm],
        hAlign="LEFT",
    )
    notes.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), WARM),
                ("BOX", (0, 0), (-1, -1), 0.7, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 3 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3 * mm),
            ]
        )
    )

    return [
        Spacer(1, 1 * mm),
        hero,
        Spacer(1, 4 * mm),
        text_step(
            1,
            "Instala QZ Tray",
            "En LaComanda pulsa <b>Descargar QZ Tray</b>, descarga la versión para Windows y abre el instalador. Acepta las opciones recomendadas y deja activo <b>Automatically start</b>.",
        ),
        Spacer(1, 2.5 * mm),
        text_step(
            2,
            "Descarga el certificado",
            "En LaComanda pulsa <b>Descargar certificado</b>. Guarda el archivo <b>certificate.pem</b> en Descargas; lo utilizarás en el siguiente paso.",
        ),
        Spacer(1, 3.5 * mm),
        Paragraph("3. Agrega el certificado siguiendo estas imágenes", ParagraphStyle("VisualTitle", fontName="Helvetica-Bold", fontSize=12, leading=15, textColor=PRIMARY_DARK, spaceAfter=2.5 * mm)),
        setup_visual,
        Spacer(1, 3.5 * mm),
        ready,
        Spacer(1, 3 * mm),
        notes,
        Spacer(1, 2 * mm),
        Paragraph("El certificado es público. Nunca descargues ni compartas un archivo llamado private-key.pem.", FOOT),
    ]


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = BaseDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        leftMargin=MARGIN_X,
        rightMargin=MARGIN_X,
        topMargin=MARGIN_TOP,
        bottomMargin=MARGIN_BOTTOM,
        title="Guía rápida para instalar y configurar QZ Tray - LaComanda",
        author="LaComanda",
        subject="Instalación de QZ Tray e importación visual del certificado de LaComanda",
        creator="LaComanda",
    )
    frame = Frame(
        MARGIN_X,
        MARGIN_BOTTOM,
        PAGE_W - 2 * MARGIN_X,
        PAGE_H - MARGIN_TOP - MARGIN_BOTTOM,
        id="content",
        showBoundary=0,
    )
    doc.addPageTemplates([PageTemplate(id="manual", frames=[frame], onPage=draw_page)])
    doc.build(build_story())
    print(OUTPUT)


if __name__ == "__main__":
    main()
