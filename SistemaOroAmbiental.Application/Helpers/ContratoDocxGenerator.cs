using System.IO.Compression;
using System.Text;
using System.Text.RegularExpressions;

namespace SistemaOroAmbiental.Application.Helpers
{
    /// <summary>
    /// Completa plantillas Word: solo reconoce campos entre llaves <c>{CAMPO}</c>.
    /// Convierte variantes rotas ([ ], {|X|}, etc.) a {CAMPO} antes de reemplazar.
    /// </summary>
    public static class ContratoDocxGenerator
    {
        private static readonly Regex RxEtiquetaLlaves = new(
            @"\{([A-Za-z0-9_]+)\}",
            RegexOptions.Compiled | RegexOptions.IgnoreCase);

        public static byte[] CompletarPlantilla(byte[] plantillaDocx, IReadOnlyDictionary<string, string> campos)
        {
            var mapa = ConstruirMapaCampos(campos);

            using var input = new MemoryStream(plantillaDocx);
            using var output = new MemoryStream();

            using (var inputZip = new ZipArchive(input, ZipArchiveMode.Read, leaveOpen: true))
            using (var outputZip = new ZipArchive(output, ZipArchiveMode.Create, leaveOpen: true))
            {
                foreach (var entry in inputZip.Entries)
                {
                    var outEntry = outputZip.CreateEntry(entry.FullName, CompressionLevel.Optimal);
                    using var inStream = entry.Open();
                    using var outStream = outEntry.Open();

                    if (EsParteWordConTexto(entry.FullName))
                    {
                        using var reader = new StreamReader(inStream, Encoding.UTF8);
                        var xml = reader.ReadToEnd();
                        xml = PrepararXmlParaReemplazo(xml);
                        xml = AplicarCampos(xml, mapa);
                        using var writer = new StreamWriter(outStream, new UTF8Encoding(false));
                        writer.Write(xml);
                    }
                    else
                    {
                        inStream.CopyTo(outStream);
                    }
                }
            }

            return output.ToArray();
        }

        private static bool EsParteWordConTexto(string fullName)
        {
            if (!fullName.StartsWith("word/", StringComparison.OrdinalIgnoreCase))
                return false;
            if (!fullName.EndsWith(".xml", StringComparison.OrdinalIgnoreCase))
                return false;
            if (fullName.Contains("_rels", StringComparison.OrdinalIgnoreCase))
                return false;
            return true;
        }

        private static Dictionary<string, string> ConstruirMapaCampos(IReadOnlyDictionary<string, string> campos)
        {
            var mapa = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (var kv in campos)
            {
                if (string.IsNullOrWhiteSpace(kv.Key)) continue;
                var clave = NormalizarNombreCampo(kv.Key);
                if (clave.Length == 0) continue;
                mapa[clave] = kv.Value ?? "";
            }
            return mapa;
        }

        private static string NormalizarNombreCampo(string key)
        {
            return Regex.Replace(key.Trim(), @"[^A-Za-z0-9_]", "");
        }

        /// <summary>Deja todas las etiquetas como {NOMBRE} unidas (sin XML en el medio).</summary>
        private static string PrepararXmlParaReemplazo(string xml)
        {
            xml = CorregirTyposPlantilla(xml);
            xml = UnirEtiquetasFragmentadas(xml, '{', '}');
            xml = UnirEtiquetasFragmentadas(xml, '[', ']');
            xml = ConvertirCorchetesALlaves(xml);
            xml = UnirEtiquetasFragmentadas(xml, '{', '}');
            xml = CorregirTyposPlantilla(xml);
            // Tab fijo en la caja de datos: evita que valores vacíos/largos desalineen la 2.ª columna.
            xml = AlinearColumnasCajaCliente(xml);
            return xml;
        }

        /// <summary>
        /// La caja del encabezado usa tabs por defecto (~0.5"). Con valores cortos/vacíos
        /// o largos la 2.ª columna se corre. Fija un tab stop (~260pt) y colapsa elementos
        /// &lt;w:tab/&gt; consecutivos a uno solo (sin borrar &lt;w:r&gt;: la plantilla anida runs).
        /// </summary>
        private static string AlinearColumnasCajaCliente(string xml)
        {
            const string tabStop =
                "<w:tabs><w:tab w:val=\"left\" w:pos=\"5200\"/></w:tabs>";

            return Regex.Replace(
                xml,
                @"<w:p\b[^>]*>[\s\S]*?</w:p>",
                m =>
                {
                    var p = m.Value;
                    if (!EsParrafoColumnaDerechaCaja(p))
                        return p;

                    // Colapsar tabs consecutivos (posiblemente en runs distintos) a uno solo.
                    // No borrar <w:r> por regex amplio: la plantilla anida runs dentro de <w:t>.
                    p = Regex.Replace(
                        p,
                        @"<w:tab\s*/>(?:\s*</w:r>\s*<w:r\b[^>]*>\s*(?:<w:rPr\b[^>]*>[\s\S]*?</w:rPr>\s*)?<w:tab\s*/>)+",
                        "<w:tab/>",
                        RegexOptions.IgnoreCase);
                    p = AsegurarTabStopEnParrafo(p, tabStop);
                    return p;
                },
                RegexOptions.IgnoreCase);
        }

        private static bool EsParrafoColumnaDerechaCaja(string paragraph)
        {
            return paragraph.Contains(">Localidad<", StringComparison.OrdinalIgnoreCase)
                || paragraph.Contains(">Localidad</", StringComparison.OrdinalIgnoreCase)
                || paragraph.Contains("{LOCALIDADCLIENTE}", StringComparison.OrdinalIgnoreCase)
                || paragraph.Contains("{CUITCLIENTE}", StringComparison.OrdinalIgnoreCase)
                || paragraph.Contains("{IVACLIENTE}", StringComparison.OrdinalIgnoreCase)
                || paragraph.Contains("{EMAILCLIENTE}", StringComparison.OrdinalIgnoreCase)
                || paragraph.Contains("Condición Fiscal", StringComparison.OrdinalIgnoreCase)
                || paragraph.Contains("Condicion Fiscal", StringComparison.OrdinalIgnoreCase)
                || paragraph.Contains(">E-Mail<", StringComparison.OrdinalIgnoreCase)
                || paragraph.Contains(">E-Mail</", StringComparison.OrdinalIgnoreCase);
        }

        private static string AsegurarTabStopEnParrafo(string paragraph, string tabStopXml)
        {
            if (paragraph.Contains("<w:tabs", StringComparison.OrdinalIgnoreCase))
            {
                return Regex.Replace(
                    paragraph,
                    @"<w:tabs\b[^>]*>[\s\S]*?</w:tabs>",
                    tabStopXml,
                    RegexOptions.IgnoreCase);
            }

            const string pPrOpen = "<w:pPr>";
            var at = paragraph.IndexOf(pPrOpen, StringComparison.OrdinalIgnoreCase);
            if (at >= 0)
                return paragraph.Insert(at + pPrOpen.Length, tabStopXml);

            var gt = paragraph.IndexOf('>');
            if (gt < 0)
                return paragraph;

            return paragraph.Insert(gt + 1, "<w:pPr>" + tabStopXml + "</w:pPr>");
        }

        private static string CorregirTyposPlantilla(string xml)
        {
            xml = xml.Replace("{|", "{", StringComparison.Ordinal);
            xml = xml.Replace("|}", "}", StringComparison.Ordinal);
            xml = Regex.Replace(xml, @"\[([A-Za-z0-9_]+)\|\}", "{$1}", RegexOptions.IgnoreCase);
            xml = Regex.Replace(xml, @"\{\|([A-Za-z0-9_]+)\]", "{$1}", RegexOptions.IgnoreCase);
            xml = Regex.Replace(xml, @"\[([A-Za-z0-9_]+)\|", "{$1}", RegexOptions.IgnoreCase);
            xml = Regex.Replace(xml, @"\|([A-Za-z0-9_]+)\]", "{$1}", RegexOptions.IgnoreCase);
            xml = Regex.Replace(xml, @"PROFESION\|CLIENTE", "PROFESIONCLIENTE", RegexOptions.IgnoreCase);
            xml = Regex.Replace(xml, @"\{PROFESION\|CLIENTE\}", "{PROFESIONCLIENTE}", RegexOptions.IgnoreCase);
            return xml;
        }

        private static string ConvertirCorchetesALlaves(string xml)
        {
            return Regex.Replace(xml, @"\[([A-Za-z0-9_]+)\]", "{$1}", RegexOptions.IgnoreCase);
        }

        private static string UnirEtiquetasFragmentadas(string xml, char abre, char cierra)
        {
            var abreEsc = Regex.Escape(abre.ToString());
            var cierraEsc = Regex.Escape(cierra.ToString());
            var noCierra = abre == '{' ? "[^}]" : "[^\\]]";

            for (var i = 0; i < 40; i++)
            {
                var antes = xml;
                xml = Regex.Replace(
                    xml,
                    abreEsc + @"((?:" + noCierra + "|<[^>]+>)*?)" + cierraEsc,
                    m =>
                    {
                        var inner = LimpiarInteriorEtiqueta(m.Groups[1].Value);
                        if (string.IsNullOrEmpty(inner) || !Regex.IsMatch(inner, @"^[A-Za-z0-9_]+$"))
                            return m.Value;
                        return "{" + inner + "}";
                    },
                    RegexOptions.Singleline | RegexOptions.IgnoreCase);

                if (xml == antes) break;
            }

            return xml;
        }

        private static string LimpiarInteriorEtiqueta(string inner)
        {
            inner = Regex.Replace(inner, @"</w:t>\s*</w:r>\s*<w:r[^>]*>\s*(?:<w:rPr[^/]*/>\s*)*(?:<w:rPr>[\s\S]*?</w:rPr>\s*)?<w:t[^>]*>", "", RegexOptions.IgnoreCase);
            inner = Regex.Replace(inner, @"</w:t>\s*<w:t[^>]*>", "", RegexOptions.IgnoreCase);
            inner = inner.Replace("|", "", StringComparison.Ordinal);
            inner = Regex.Replace(inner, @"<[^>]+>", "", RegexOptions.IgnoreCase);
            return inner.Trim();
        }

        private static string AplicarCampos(string xml, Dictionary<string, string> mapa)
        {
            if (mapa.Count == 0) return xml;

            var clavesOrdenadas = mapa.Keys.OrderByDescending(k => k.Length).ToList();

            foreach (var clave in clavesOrdenadas)
            {
                var valor = EscaparTextoXml(mapa[clave]);
                var patron = "\\{" + Regex.Escape(clave) + "\\}";
                xml = Regex.Replace(xml, patron, valor, RegexOptions.IgnoreCase);
            }

            return xml;
        }

        /// <summary>Campos que quedaron sin reemplazar (para diagnóstico).</summary>
        public static IReadOnlyList<string> ListarEtiquetasPendientes(byte[] plantillaDocx)
        {
            var pendientes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            using var input = new MemoryStream(plantillaDocx);
            using var zip = new ZipArchive(input, ZipArchiveMode.Read);
            foreach (var entry in zip.Entries)
            {
                if (!EsParteWordConTexto(entry.FullName)) continue;
                using var reader = new StreamReader(entry.Open(), Encoding.UTF8);
                var xml = PrepararXmlParaReemplazo(reader.ReadToEnd());
                foreach (Match m in RxEtiquetaLlaves.Matches(xml))
                {
                    if (!string.IsNullOrWhiteSpace(m.Groups[1].Value))
                        pendientes.Add(m.Groups[1].Value);
                }
            }

            return pendientes.OrderBy(x => x).ToList();
        }

        private static string EscaparTextoXml(string text)
        {
            return text
                .Replace("&", "&amp;", StringComparison.Ordinal)
                .Replace("<", "&lt;", StringComparison.Ordinal)
                .Replace(">", "&gt;", StringComparison.Ordinal)
                .Replace("\"", "&quot;", StringComparison.Ordinal);
        }
    }
}
