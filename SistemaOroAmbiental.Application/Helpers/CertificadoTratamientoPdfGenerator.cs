using System.Globalization;
using System.Text;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Helpers
{
    /// <summary>
    /// Réplica al milímetro del certificado oficial (MediaBox 1008×612 pt, Helvetica).
    /// Coordenadas medidas del PDF del cliente (origen arriba-izquierda en QuestPDF).
    /// </summary>
    public static class CertificadoTratamientoPdfGenerator
    {
        private const float PageW = 1008f;
        private const float PageH = 612f;
        private const float Line = 0.6f;

        // Grises medidos del PDF: title Gray 0.471 / barras Gray 0.388
        private static readonly string GrayTitle = "#787878";
        private static readonly string GrayBar = "#636363";

        static CertificadoTratamientoPdfGenerator()
        {
            QuestPDF.Settings.License = LicenseType.Community;
        }

        public static byte[] Generar(CertificadoTratamientoItemDto item)
            => Generar(new List<CertificadoTratamientoItemDto> { item });

        public static byte[] Generar(IReadOnlyList<CertificadoTratamientoItemDto> items)
        {
            if (items == null || items.Count == 0)
                throw new InvalidOperationException("No hay certificados para exportar.");

            return Document.Create(container =>
            {
                foreach (var item in items)
                {
                    container.Page(page =>
                    {
                        page.Size(PageW, PageH, Unit.Point);
                        page.Margin(0);
                        page.PageColor(Colors.White);
                        page.DefaultTextStyle(x => x
                            .FontFamily("Helvetica")
                            .FontSize(10)
                            .FontColor(Colors.Black)
                            .LineHeight(1.1f));

                        page.Content()
                            .Width(PageW)
                            .Height(PageH)
                            .Layers(layers =>
                            {
                                // Capa base (requerida por QuestPDF)
                                layers.PrimaryLayer().Background(Colors.White);

                                // Marco exterior: (23,27)-(993,577) → top=35
                                layers.Layer()
                                    .TranslateX(23).TranslateY(35)
                                    .Width(970).Height(550)
                                    .Border(Line).BorderColor(Colors.Black);

                                // Título: (30,518)-(480,552) → top=60, 450×34
                                layers.Layer()
                                    .TranslateX(30).TranslateY(60)
                                    .Width(450).Height(34)
                                    .Background(GrayTitle)
                                    .AlignCenter().AlignMiddle()
                                    .PaddingHorizontal(8)
                                    .Text("CERTIFICADO DE TRATAMIENTO DE RESIDUOS\nPATOGENICOS")
                                    .FontFamily("Helvetica").FontSize(16).Bold()
                                    .FontColor(Colors.White)
                                    .AlignCenter()
                                    .LineHeight(1.05f);

                                // Fecha alineada a la izquierda (x=503, termina ~672); "Nro." en x=714.8 (sobre "dos")
                                layers.Layer()
                                    .PaddingLeft(503).PaddingTop(58)
                                    .Width(170).Height(14)
                                    .AlignLeft().AlignMiddle()
                                    .Text(t =>
                                    {
                                        t.Span("Fecha de Emision: ").FontFamily("Helvetica").FontSize(12).Bold();
                                        t.Span(FechaTxt(item.FechaEmision)).FontFamily("Helvetica").FontSize(12);
                                    });

                                layers.Layer()
                                    .PaddingLeft(714.8f).PaddingTop(58)
                                    .Width(262).Height(14)
                                    .AlignLeft().AlignMiddle()
                                    .Text(t =>
                                    {
                                        t.Span("Nro. Certificado: ").FontFamily("Helvetica").FontSize(12).Bold();
                                        t.Span(item.NumeroCertificado.ToString(CultureInfo.InvariantCulture))
                                            .FontFamily("Helvetica").FontSize(12).Bold();
                                    });

                                // Texto legal (x=503, debajo de fecha; ~3 líneas italic 8pt)
                                layers.Layer()
                                    .TranslateX(503).TranslateY(74)
                                    .Width(474).Height(42)
                                    .Text(ManifiestoDatosEmpresa.CertificadoTextoLegal)
                                    .FontFamily("Helvetica").FontSize(8).Italic()
                                    .FontColor(Colors.Black)
                                    .AlignLeft()
                                    .LineHeight(1.2f);

                                // DATOS DEL TRATADOR: (30,338.5)-(480,492) → top=120, 450×153.5
                                // La barra gris del original está ~21 pt debajo del borde superior.
                                layers.Layer()
                                    .TranslateX(30).TranslateY(120)
                                    .Width(450).Height(153.5f)
                                    .Element(c => CajaDatos(c, "DATOS DEL TRATADOR", 10f, new[]
                                    {
                                        ("Razón Social:", ManifiestoDatosEmpresa.CertificadoTratadorRazonSocial),
                                        ("C.H.E. Nro.:", ManifiestoDatosEmpresa.CertificadoTratadorChe),
                                        ("Ubicacion de la planta de tratamiento:",
                                            $"Calle: {ManifiestoDatosEmpresa.CertificadoTratadorCalle} Nro: {ManifiestoDatosEmpresa.CertificadoTratadorNumero} Piso: Ruta:\nKm: Localidad: {ManifiestoDatosEmpresa.CertificadoTratadorLocalidad}"),
                                        ("Firma Resp. Tecnico:", "")
                                    }));

                                // DATOS DEL GENERADOR: (500,338.5)-(980,492) → top=120, 480×153.5
                                // Título del original en Arial 12 (un poco mayor que TRATADOR).
                                layers.Layer()
                                    .TranslateX(500).TranslateY(120)
                                    .Width(480).Height(153.5f)
                                    .Element(c => CajaDatos(c, "DATOS DEL GENERADOR", 12f, new[]
                                    {
                                        ("Razon Social:", (item.RazonSocial ?? "").Trim().ToUpperInvariant()),
                                        ("C.H.E. Nro.:", (item.CheNro ?? "").Trim()),
                                        ("Domicilio Real:", DomicilioGenerador(item)),
                                        ("Firma:", "")
                                    }));
                                // DATOS OPERATIVOS + tabla: x=30.5, top≈301.8
                                // Alto: barra 14.6 + header 41.8 + data 41.8 ≈ 98; margen extra por bordes.
                                layers.Layer()
                                    .TranslateX(30.5f).TranslateY(301.8f)
                                    .Width(950).Height(110)
                                    .Element(c => TablaOperativos(c, item));

                                // Notas al pie (cerca del borde inferior, como el original)
                                layers.Layer()
                                    .TranslateX(30).TranslateY(507)
                                    .Width(950).Height(70)
                                    .Element(NotasPie);
                            });
                    });
                }
            }).GeneratePdf();
        }

        public static string NombreArchivo(CertificadoTratamientoItemDto item)
        {
            var limpio = Sanitizar(item.RazonSocial);
            return $"Certificado_{item.NumeroCertificado}_{limpio}.pdf";
        }

        public static string NombreArchivoLote(IReadOnlyList<CertificadoTratamientoItemDto> items)
        {
            if (items.Count == 1)
                return NombreArchivo(items[0]);
            var desde = items.Min(x => x.NumeroCertificado);
            var hasta = items.Max(x => x.NumeroCertificado);
            return $"Certificados_{desde}-{hasta}.pdf";
        }

        private static void CajaDatos(IContainer container, string titulo, float tituloSize, (string Label, string Value)[] lineas)
        {
            container.Border(Line).BorderColor(Colors.Black).Column(col =>
            {
                // Espacio superior medido en el PDF oficial (~21 pt) antes de la barra gris.
                col.Item().Height(20);

                col.Item().PaddingHorizontal(5).Element(bar =>
                {
                    bar.Background(GrayBar).Height(tituloSize <= 10 ? 12f : 14f)
                        .AlignCenter().AlignMiddle()
                        .Text(titulo)
                        .FontFamily("Helvetica").FontSize(tituloSize)
                        .FontColor(Colors.White);
                });

                col.Item().Background(Colors.White)
                    .PaddingHorizontal(8).PaddingTop(10).PaddingBottom(4)
                    .Column(inner =>
                    {
                        // Interlineado ~15 pt entre baselines del original (438→423→408→393/378)
                        inner.Spacing(5);
                        foreach (var (label, value) in lineas)
                        {
                            inner.Item().Text(t =>
                            {
                                t.Span(label + " ").FontFamily("Helvetica").FontSize(10).Bold();
                                t.Span(value ?? "").FontFamily("Helvetica").FontSize(10);
                            });
                        }
                    });
            });
        }
        private static void TablaOperativos(IContainer container, CertificadoTratamientoItemDto item)
        {
            // Anchos de columna medidos del PDF oficial (pt)
            float[] anchos = { 99.3f, 29.2f, 69.3f, 49.3f, 74.3f, 49.3f, 59.3f, 99.2f, 89.4f, 99.2f, 224.3f };

            container.Column(col =>
            {
                col.Item().Background(GrayBar).Height(14.6f)
                    .AlignCenter().AlignMiddle()
                    .Text("DATOS OPERATIVOS")
                    .FontFamily("Helvetica").FontSize(10).Bold()
                    .FontColor(Colors.White);

                col.Item().Table(table =>
                {
                    table.ColumnsDefinition(columns =>
                    {
                        foreach (var w in anchos)
                            columns.ConstantColumn(w);
                    });

                    void HeaderCell(string text)
                    {
                        // Fila encabezado: alto 41.8 pt; texto arriba como en el original.
                        table.Cell().Border(Line).BorderColor(Colors.Black)
                            .Background(Colors.White)
                            .PaddingHorizontal(2).PaddingTop(3).Height(41.8f)
                            .AlignCenter().AlignTop()
                            .Text(text)
                            .FontFamily("Helvetica").FontSize(10).Bold()
                            .AlignCenter()
                            .LineHeight(1.02f);
                    }

                    HeaderCell("Nombre de los\nresiduos\ntratados(1)");
                    HeaderCell("Tipo\n(2)");
                    HeaderCell("Peligrosidad\n(3)");
                    HeaderCell("Estado\nFisico");
                    HeaderCell("N° de\nmanifiesto de\ntransporte");
                    HeaderCell("Cantidad\n(4)");
                    HeaderCell("Fecha (5)");
                    HeaderCell("N° orden del\nregistro de\noperaciones(6)");
                    HeaderCell("Tipo de\ntratamiento(7)");
                    HeaderCell("Residuos del\ntratamiento(8)");
                    HeaderCell("Lugar de\ndisposicion final(9)");

                    void DataCell(string text)
                    {
                        // Fila datos: alto 41.8 pt; en el original el texto va arriba (no centrado).
                        table.Cell().Border(Line).BorderColor(Colors.Black)
                            .Background(Colors.White)
                            .PaddingHorizontal(2).PaddingTop(4).Height(41.8f)
                            .AlignCenter().AlignTop()
                            .Text(text ?? "")
                            .FontFamily("Helvetica").FontSize(10)
                            .AlignCenter()
                            .LineHeight(1.05f);
                    }

                    DataCell(ManifiestoDatosEmpresa.CertificadoNombreResiduo);
                    DataCell(ManifiestoDatosEmpresa.CertificadoTipoResiduo);
                    DataCell(ManifiestoDatosEmpresa.CertificadoPeligrosidad);
                    DataCell(ManifiestoDatosEmpresa.CertificadoEstadoFisico);
                    DataCell(item.NumeroManifiesto.ToString(CultureInfo.InvariantCulture));
                    DataCell(item.Cantidad);
                    DataCell(FechaTxt(item.FechaTratamiento));
                    DataCell(item.NumeroOrdenOperaciones.ToString(CultureInfo.InvariantCulture));
                    DataCell(ManifiestoDatosEmpresa.CertificadoTipoTratamiento);
                    DataCell(ManifiestoDatosEmpresa.CertificadoResiduosTratamiento);
                    DataCell(ManifiestoDatosEmpresa.CertificadoDisposicionFinal);
                });
            });
        }

        private static void NotasPie(IContainer container)
        {
            // Original: col1 = 1-3, col2 = 4-7, col3 = 8-9
            var col1 = new[]
            {
                "1. De acuerdo a la nomenclatura consignada en la Declaración Jurada del Decreto\n806/97 presentada ante el O.P.D.S. o \"Residuos Patogénicos\" cuando\ncorresponda.",
                "2. De acuerdo al Anexo I de la Ley 11720 o al artículo 2° del Decreto 403/97.",
                "3. De acuerdo al Anexo II de la Ley 11720 o los Códigos \"H\" del Convenio de\nBasilea."
            };
            var col2 = new[]
            {
                "4. Masa.",
                "5. Fecha de tratamiento.",
                "6. De forma que quede debidamente identificable.",
                "7. De acuerdo a lo autorizado por el O.P.D.S."
            };
            var col3 = new[]
            {
                "8. Consignar los residuos que se originen como consecuencia del proceso u\noperación de tratamiento, indicando si los mismos poseen características de\npeligrosidad.",
                "9. Nombre del establecimiento o centro de disposición final."
            };

            container.Row(row =>
            {
                void Columna(string[] notas, float width)
                {
                    row.ConstantItem(width).Column(c =>
                    {
                        c.Spacing(3);
                        foreach (var n in notas)
                        {
                            c.Item().Text(n)
                                .FontFamily("Helvetica")
                                .FontSize(8)
                                .Italic()
                                .FontColor(Colors.Black)
                                .LineHeight(1.12f);
                        }
                    });
                }

                // Anchos aprox. según inicio de columnas en el original (x≈31, 383, 633)
                Columna(col1, 340);
                row.ConstantItem(12);
                Columna(col2, 240);
                row.ConstantItem(12);
                Columna(col3, 346);
            });
        }

        private static string DomicilioGenerador(CertificadoTratamientoItemDto item)
        {
            var calle = (item.Calle ?? "").Trim();
            var nro = (item.NumeroCalle ?? "").Trim();
            var loc = (item.Localidad ?? "").Trim();
            var calleTxt = string.IsNullOrWhiteSpace(calle) ? "" : calle.ToUpperInvariant();
            var locTxt = string.IsNullOrWhiteSpace(loc) ? "" : loc.ToUpperInvariant();
            return $"Calle: {calleTxt} Nro: {nro} Localidad: {locTxt}";
        }

        private static string VacioSiBlanco(string? valor)
            => string.IsNullOrWhiteSpace(valor) ? "" : valor.Trim();

        private static string FechaTxt(DateTime fecha)
        {
            var d = fecha == default ? DateTime.Today : fecha.Date;
            return d.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture);
        }

        private static string Sanitizar(string valor)
        {
            var invalidos = Path.GetInvalidFileNameChars();
            var sb = new StringBuilder((valor ?? "").Length);
            foreach (var c in (valor ?? "").Trim())
                sb.Append(invalidos.Contains(c) ? '_' : c);
            var limpio = sb.ToString().Replace(' ', '_');
            return limpio.Length > 40 ? limpio[..40] : limpio;
        }

        public static CertificadoTratamientoItemDto DesdeManifiestoItem(
            ManifiestoItemDto item,
            DateTime fechaEmision,
            int numeroCertificado,
            DateTime fechaTratamiento,
            int numeroOrden)
        {
            return new CertificadoTratamientoItemDto
            {
                NumeroManifiesto = item.Numero,
                NumeroCertificado = numeroCertificado,
                NumeroOrdenOperaciones = numeroOrden,
                FechaEmision = fechaEmision.Date,
                FechaTratamiento = fechaTratamiento.Date,
                Cantidad = item.Cantidad ?? "",
                RazonSocial = item.RazonSocial ?? "",
                CheNro = item.IdEstablecimiento ?? "",
                Calle = item.Calle ?? "",
                NumeroCalle = item.NumeroCalle ?? "",
                Piso = item.Piso ?? "",
                Localidad = item.Localidad ?? ""
            };
        }
    }
}
