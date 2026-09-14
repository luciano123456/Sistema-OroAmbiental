using System.Globalization;
using System.Text;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Helpers
{
    public static class ManifiestoPdfGenerator
    {
        static ManifiestoPdfGenerator()
        {
            QuestPDF.Settings.License = LicenseType.Community;
        }

        public static byte[] Generar(ManifiestosHojaDto model, string? headerImagePath)
        {
            var items = model?.Items ?? new List<ManifiestoItemDto>();
            if (items.Count == 0)
                throw new InvalidOperationException("No hay manifiestos para exportar.");

            var fechaProgramacion = model!.FechaProgramacion == default
                ? DateTime.Today
                : model.FechaProgramacion.Date;

            byte[]? header = null;
            if (!string.IsNullOrWhiteSpace(headerImagePath) && File.Exists(headerImagePath))
                header = File.ReadAllBytes(headerImagePath);

            return Document.Create(container =>
            {
                foreach (var item in items)
                    Pagina(container, item, fechaProgramacion, header, model);
            }).GeneratePdf();
        }

        public static byte[] GenerarUno(ManifiestosHojaDto model, ManifiestoItemDto item, string? headerImagePath)
        {
            var copia = new ManifiestosHojaDto
            {
                IdCamion = model.IdCamion,
                IdSemana = model.IdSemana,
                IdDia = model.IdDia,
                RecorridosParam = model.RecorridosParam,
                Titulo = model.Titulo,
                Nombre = item.RazonSocial,
                FechaProgramacion = model.FechaProgramacion,
                NumeroInicial = item.Numero,
                ChoferNombre = model.ChoferNombre,
                ChoferDni = model.ChoferDni,
                ChoferFirmaPng = model.ChoferFirmaPng,
                Items = new List<ManifiestoItemDto> { item }
            };
            return Generar(copia, headerImagePath);
        }

        public static string NombreArchivo(ManifiestosHojaDto model)
        {
            var items = model?.Items ?? new List<ManifiestoItemDto>();
            var nombre = (model?.Nombre ?? "").Trim();
            if (string.IsNullOrWhiteSpace(nombre) && items.Count == 1)
                nombre = (items[0].RazonSocial ?? "").Trim();
            if (string.IsNullOrWhiteSpace(nombre))
                nombre = (model?.Titulo ?? "").Trim();
            if (string.IsNullOrWhiteSpace(nombre))
                nombre = "Manifiesto";

            var limpio = Sanitizar(nombre);
            if (items.Count == 1)
                return $"Manifiesto_{items[0].Numero}_{limpio}.pdf";

            var desde = items.Min(x => x.Numero);
            var hasta = items.Max(x => x.Numero);
            return $"Manifiestos_{desde}-{hasta}_{limpio}.pdf";
        }

        public static string NombreArchivoCliente(ManifiestoItemDto item, DateTime fecha, int copiaIndex)
        {
            var cliente = Sanitizar(item.RazonSocial);
            if (string.IsNullOrWhiteSpace(cliente))
                cliente = "Cliente";
            var fechaTxt = (fecha == default ? DateTime.Today : fecha.Date)
                .ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            var extra = copiaIndex > 1 ? $"_{copiaIndex}" : "";
            return $"{cliente}_{fechaTxt}{extra}.pdf";
        }

        public static string NombreCarpetaLote(ManifiestosHojaDto model)
        {
            var fecha = (model.FechaProgramacion == default ? DateTime.Today : model.FechaProgramacion.Date)
                .ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            var rec = Sanitizar(model.Nombre);
            if (string.IsNullOrWhiteSpace(rec))
                rec = Sanitizar(model.Titulo);
            if (string.IsNullOrWhiteSpace(rec))
                rec = "Recorrido";
            return $"{fecha}_{rec}";
        }

        private static void Pagina(
            IDocumentContainer container,
            ManifiestoItemDto item,
            DateTime fechaProgramacion,
            byte[]? header,
            ManifiestosHojaDto model)
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.MarginHorizontal(10, Unit.Millimetre);
                page.MarginTop(8, Unit.Millimetre);
                page.MarginBottom(12, Unit.Millimetre);
                page.PageColor(Colors.White);
                page.DefaultTextStyle(x => x
                    .FontFamily("Helvetica")
                    .FontSize(7)
                    .FontColor(Colors.Black)
                    .LineHeight(14.17f / 7f));

                page.Content().Column(col =>
                {
                    if (header != null && header.Length > 0)
                    {
                        col.Item()
                            .Width(130, Unit.Millimetre)
                            .Height(10.8f, Unit.Millimetre)
                            .Image(header)
                            .FitArea();
                    }

                    col.Item().PaddingTop(6).Text("Manifiesto de Residuos PATOGENICOS")
                        .FontSize(10)
                        .Bold()
                        .LineHeight(1);

                    col.Item().PaddingTop(4).PaddingBottom(6).Row(row =>
                    {
                        row.RelativeItem().Text($"Manifiesto Nº:{item.Numero}")
                            .FontSize(8)
                            .Bold()
                            .LineHeight(1);
                        row.AutoItem().Text($"Fecha de Programación: {FechaTxt(fechaProgramacion)}")
                            .FontSize(8)
                            .Bold()
                            .LineHeight(1);
                    });

                    Barra(col, "Origen");
                    Fila2(col,
                        $"Origen del residuo: {ManifiestoDatosEmpresa.OrigenDelResiduo}",
                        $"Id Establecimiento: {item.IdEstablecimiento}",
                        corta: true);
                    Fila2(col,
                        $"CUIT: {item.Cuit}",
                        $"Razon Social: {item.RazonSocial}",
                        corta: true);
                    Fila1(col, $"Direccion: {item.Direccion}");
                    Fila2(col,
                        $"Localidad: {item.Localidad}",
                        $"Telefono: {item.Telefono}");

                    Barra(col, "Residuos");
                    Fila1(col, $"Tipo Destino: {ManifiestoDatosEmpresa.TipoDestino}");
                    Fila1(col, $"Composicion: {ManifiestoDatosEmpresa.CategoriaResiduo}");
                    Fila1(col, $"Categoria Desecho Principal: {ManifiestoDatosEmpresa.CategoriaDesechoPrincipal}");
                    Fila1(col, $"Carac. Peligrosas: {ManifiestoDatosEmpresa.CaracteristicaPeligrosidad}");
                    Fila1(col, CantidadTexto(item.Cantidad));
                    Fila1(col, $"Estado Fisico: {ManifiestoDatosEmpresa.EstadoFisico}");
                    Fila1(col, "Observaciones:");
                    Firmas(col, false, null, null, null);

                    Barra(col, "Transportista");
                    Fila1(col, $"CUIT: {ManifiestoDatosEmpresa.TransportistaCuit}");
                    Fila1(col, $"Razon Social: {ManifiestoDatosEmpresa.TransportistaRazonSocial}");
                    Fila1(col, $"Domicilio: {ManifiestoDatosEmpresa.TransportistaDomicilio}");
                    Fila2(col,
                        $"Localidad: {ManifiestoDatosEmpresa.TransportistaLocalidad}",
                        $"Telefono: {ManifiestoDatosEmpresa.TransportistaTelefono}");
                    Firmas(col, true, model.ChoferNombre, model.ChoferDni, model.ChoferFirmaPng);

                    Barra(col, "Operador");
                    Fila2(col,
                        $"Destino del residuo: {ManifiestoDatosEmpresa.TipoDestino}",
                        $"Id Establecimiento: {ManifiestoDatosEmpresa.OperadorIdEstablecimiento}",
                        corta: true);
                    Fila2(col,
                        $"CUIT: {ManifiestoDatosEmpresa.OperadorCuit}",
                        $"Razon Social: {ManifiestoDatosEmpresa.OperadorRazonSocial}",
                        corta: true);
                    Fila1(col, $"Domicilio: {ManifiestoDatosEmpresa.OperadorDomicilio}");
                    Fila2(col,
                        $"Localidad: {ManifiestoDatosEmpresa.OperadorLocalidad}",
                        $"Telefono: {ManifiestoDatosEmpresa.OperadorTelefono}");
                    Firmas(col, false, null, null, null);
                });
            });
        }

        private static void Barra(ColumnDescriptor col, string titulo)
        {
            col.Item()
                .PaddingTop(6)
                .PaddingBottom(4)
                .Border(0.57f)
                .BorderColor(Colors.Black)
                .Background(Colors.White)
                .Height(17)
                .AlignCenter()
                .AlignMiddle()
                .Text(titulo)
                .FontSize(10)
                .Bold()
                .FontColor(Colors.Black)
                .LineHeight(1);
        }

        private static void Fila1(ColumnDescriptor col, string texto)
        {
            col.Item().Text(texto);
        }

        private static void Fila2(ColumnDescriptor col, string izquierda, string derecha, bool corta = false)
        {
            col.Item().Row(row =>
            {
                if (corta)
                {
                    row.ConstantItem(50, Unit.Millimetre).Text(izquierda);
                    row.RelativeItem().Text(derecha);
                    return;
                }

                row.RelativeItem().Text(izquierda);
                row.RelativeItem().Text(derecha);
            });
        }

        private static void LineaHorizontal(ColumnDescriptor col)
        {
            col.Item().PaddingTop(2).PaddingBottom(4).LineHorizontal(0.57f).LineColor(Colors.Black);
        }

        private static void LineaSolida(IContainer container)
        {
            container.LineHorizontal(0.57f).LineColor(Colors.Black);
        }

        private static void CampoConLinea(IContainer container, string etiqueta, string? valorArriba, byte[]? firmaPng)
        {
            container.Row(row =>
            {
                row.AutoItem().AlignBottom().PaddingBottom(1).Text(etiqueta);
                row.RelativeItem().PaddingLeft(3).Column(inner =>
                {
                    if (firmaPng != null && firmaPng.Length > 0)
                    {
                        inner.Item()
                            .Height(14, Unit.Millimetre)
                            .PaddingBottom(2)
                            .AlignBottom()
                            .Image(firmaPng)
                            .FitArea();
                    }
                    else
                    {
                        inner.Item()
                            .MinHeight(10)
                            .PaddingBottom(2)
                            .AlignBottom()
                            .Text(string.IsNullOrWhiteSpace(valorArriba) ? " " : valorArriba);
                    }

                    inner.Item().Element(LineaSolida);
                });
            });
        }

        private static void FechaHoraConLineas(IContainer container)
        {
            container.Row(row =>
            {
                void Etiqueta(string texto) =>
                    row.AutoItem().AlignBottom().PaddingBottom(1).Text(texto);

                void Tramo(float mm)
                {
                    row.ConstantItem(mm, Unit.Millimetre).AlignBottom().Column(inner =>
                    {
                        inner.Item().MinHeight(10).PaddingBottom(2);
                        inner.Item().Element(LineaSolida);
                    });
                }

                Etiqueta("Fecha:");
                Tramo(8);
                Etiqueta("/");
                Tramo(8);
                Etiqueta("/");
                Tramo(8);
                Etiqueta(" Hora:");
                row.RelativeItem().AlignBottom().Column(inner =>
                {
                    inner.Item().MinHeight(10).PaddingBottom(2);
                    inner.Item().Element(LineaSolida);
                });
            });
        }

        private static void Firmas(
            ColumnDescriptor col,
            bool chofer,
            string? choferNombre,
            string? choferDni,
            byte[]? firmaPng)
        {
            LineaHorizontal(col);

            var nombre = (choferNombre ?? "").Trim();
            var dni = (choferDni ?? "").Trim();
            var hayFirma = chofer && firmaPng != null && firmaPng.Length > 0;
            var aclaracion = chofer && !string.IsNullOrWhiteSpace(nombre) ? nombre : null;
            var documento = chofer && !string.IsNullOrWhiteSpace(dni) ? dni : null;

            col.Item().Row(row =>
            {
                row.RelativeItem().AlignBottom().PaddingRight(18, Unit.Millimetre).Element(c =>
                    CampoConLinea(c, chofer ? "Chofer:" : "Firma del Responsable:", null, hayFirma ? firmaPng : null));
                row.RelativeItem().AlignBottom().PaddingLeft(6).PaddingRight(28, Unit.Millimetre).Element(c =>
                    CampoConLinea(c, "Aclaracion:", aclaracion, null));
            });
            col.Item().Row(row =>
            {
                row.RelativeItem().AlignBottom().PaddingRight(18, Unit.Millimetre).Element(FechaHoraConLineas);
                row.RelativeItem().AlignBottom().PaddingLeft(6).PaddingRight(28, Unit.Millimetre).Element(c =>
                    CampoConLinea(c, "Documento:", documento, null));
            });
        }

        private static string CantidadTexto(string? cantidad)
        {
            var kilos = (cantidad ?? "").Trim();
            if (string.IsNullOrWhiteSpace(kilos))
                return "Cantidad(Kilos):";
            return $"Cantidad(Kilos):{kilos} (Aproximado, debera validar el Operador )";
        }

        private static string FechaTxt(DateTime fecha)
        {
            var d = fecha == default ? DateTime.Today : fecha.Date;
            return d.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture);
        }

        private static string Sanitizar(string valor)
        {
            var invalidos = Path.GetInvalidFileNameChars();
            var sb = new StringBuilder(valor.Length);
            foreach (var c in valor.Trim())
                sb.Append(invalidos.Contains(c) ? '_' : c);
            var limpio = sb.ToString().Replace(' ', '_');
            return limpio.Length > 40 ? limpio[..40] : limpio;
        }
    }
}
