using System.IO.Compression;
using System.Text;
using System.Text.RegularExpressions;

namespace SistemaOroAmbiental.Application.Helpers
{
    /// <summary>
    /// Inserta (o quita) la firma de empresa en un .docx: tag {FIRMAEMPRESA} o pie de ORO AMBIENTAL.
    /// La imagen flota sobre el renglón de la X (lado ORO AMBIENTAL) sin sumar altura de párrafo.
    /// </summary>
    public static class ContratoDocxFirmaInserter
    {
        private const string RelId = "rIdFirmaEmp";
        private const string MediaPart = "word/media/firmaEmpresa.png";
        private const long CxEmu = 1656000; // ~4.6 cm
        private const long CyEmu = 504000;  // ~1.4 cm
        // A la derecha de la X del renglón ORO AMBIENTAL (no centrada sobre la X).
        private const long PosXEmu = 3784600; // ~298 pt
        // Más cerca del renglón (antes quedaba demasiado arriba).
        private const long PosYEmu = -190500; // ~-15 pt

        public static byte[] Aplicar(byte[] docxBytes, byte[]? pngBytes)
        {
            if (docxBytes == null || docxBytes.Length == 0)
                return docxBytes ?? Array.Empty<byte>();

            var conImagen = pngBytes != null && pngBytes.Length > 0;
            var drawing = conImagen ? ConstruirDrawing() : "";

            using var input = new MemoryStream(docxBytes);
            using var output = new MemoryStream();

            using (var inputZip = new ZipArchive(input, ZipArchiveMode.Read, leaveOpen: true))
            using (var outputZip = new ZipArchive(output, ZipArchiveMode.Create, leaveOpen: true))
            {
                foreach (var entry in inputZip.Entries)
                {
                    if (string.Equals(entry.FullName, MediaPart, StringComparison.OrdinalIgnoreCase))
                        continue;

                    var outEntry = outputZip.CreateEntry(entry.FullName, CompressionLevel.Optimal);
                    using var inStream = entry.Open();
                    using var outStream = outEntry.Open();

                    var name = entry.FullName.Replace('\\', '/');
                    if (name.Equals("[Content_Types].xml", StringComparison.OrdinalIgnoreCase) && conImagen)
                    {
                        using var reader = new StreamReader(inStream, Encoding.UTF8);
                        var xml = AsegurarPngContentType(reader.ReadToEnd());
                        using var writer = new StreamWriter(outStream, new UTF8Encoding(false));
                        writer.Write(xml);
                    }
                    else if (name.Equals("word/_rels/document.xml.rels", StringComparison.OrdinalIgnoreCase) && conImagen)
                    {
                        using var reader = new StreamReader(inStream, Encoding.UTF8);
                        var xml = AsegurarRelacionImagen(reader.ReadToEnd());
                        using var writer = new StreamWriter(outStream, new UTF8Encoding(false));
                        writer.Write(xml);
                    }
                    else if (name.Equals("word/document.xml", StringComparison.OrdinalIgnoreCase))
                    {
                        using var reader = new StreamReader(inStream, Encoding.UTF8);
                        var xml = reader.ReadToEnd();
                        xml = AplicarEnDocumentXml(xml, drawing, conImagen);
                        using var writer = new StreamWriter(outStream, new UTF8Encoding(false));
                        writer.Write(xml);
                    }
                    else
                    {
                        inStream.CopyTo(outStream);
                    }
                }

                if (conImagen)
                {
                    var media = outputZip.CreateEntry(MediaPart, CompressionLevel.Optimal);
                    using var ms = media.Open();
                    ms.Write(pngBytes!, 0, pngBytes!.Length);
                }
            }

            return output.ToArray();
        }

        private static string AplicarEnDocumentXml(string xml, string drawing, bool conImagen)
        {
            xml = QuitarParrafoSoloTagFirma(xml);
            xml = Regex.Replace(xml, @"\{FIRMAEMPRESA\}", "", RegexOptions.IgnoreCase);
            // Mantener renglón de firmas + aclaración juntos (también sin imagen).
            xml = AsegurarKeepNextEnRenglonFirmas(xml);
            if (!conImagen)
                return xml;

            return InsertarSobreRenglonEmpresa(xml, drawing);
        }

        /// <summary>
        /// keepNext en el párrafo de las X para que no se separe de GENERADOR / ORO AMBIENTAL.
        /// </summary>
        private static string AsegurarKeepNextEnRenglonFirmas(string xml)
        {
            var needle = "ORO AMBIENTAL GROUP S.R.L.";
            var idx = xml.LastIndexOf(needle, StringComparison.OrdinalIgnoreCase);
            if (idx < 0)
                return xml;

            var companyP = LastIndexOfParagraphStart(xml, idx);
            if (companyP < 0)
                return xml;

            var lineP = LastIndexOfParagraphStart(xml, companyP);
            if (lineP < 0)
                return xml;

            var lineEnd = xml.IndexOf("</w:p>", lineP, StringComparison.Ordinal);
            if (lineEnd < 0)
                return xml;

            var paragraph = xml.Substring(lineP, lineEnd - lineP);
            if (!paragraph.Contains("X_", StringComparison.Ordinal) && !paragraph.Contains("X_", StringComparison.OrdinalIgnoreCase))
            {
                // El renglón de firmas suele ser "X____"; si no está, no tocar.
                if (!paragraph.Contains("____", StringComparison.Ordinal))
                    return xml;
            }

            paragraph = AsegurarKeepNext(paragraph);
            return xml.Substring(0, lineP) + paragraph + xml.Substring(lineEnd);
        }

        /// <summary>
        /// Quita el párrafo que solo tenía tabs + {FIRMAEMPRESA}: ese párrafo extra
        /// empujaba firma y aclaración a la hoja siguiente.
        /// </summary>
        private static string QuitarParrafoSoloTagFirma(string xml)
        {
            var tagMatch = Regex.Match(xml, @"\{FIRMAEMPRESA\}", RegexOptions.IgnoreCase);
            if (!tagMatch.Success)
                return xml;

            var pStart = LastIndexOfParagraphStart(xml, tagMatch.Index);
            if (pStart < 0)
                return xml;

            var pEnd = xml.IndexOf("</w:p>", tagMatch.Index, StringComparison.Ordinal);
            if (pEnd < 0)
                return xml;

            pEnd += "</w:p>".Length;
            var paragraph = xml.Substring(pStart, pEnd - pStart);
            var sinTags = Regex.Replace(paragraph, @"<[^>]+>", "");
            sinTags = Regex.Replace(sinTags, @"\{FIRMAEMPRESA\}", "", RegexOptions.IgnoreCase);
            sinTags = Regex.Replace(sinTags, @"\s+", "");
            if (sinTags.Length > 0)
                return xml;

            return xml.Remove(pStart, pEnd - pStart);
        }

        /// <summary>
        /// Flota la firma sobre la X del renglón de ORO AMBIENTAL y mantiene juntos
        /// el renglón de firmas con la aclaración (GENERADOR / ORO AMBIENTAL).
        /// </summary>
        private static string InsertarSobreRenglonEmpresa(string xml, string drawing)
        {
            var needle = "ORO AMBIENTAL GROUP S.R.L.";
            var idx = xml.LastIndexOf(needle, StringComparison.OrdinalIgnoreCase);
            if (idx < 0)
                return xml;

            var companyP = LastIndexOfParagraphStart(xml, idx);
            if (companyP < 0)
                return xml;

            var lineP = LastIndexOfParagraphStart(xml, companyP);
            if (lineP < 0)
                lineP = companyP;

            var lineEnd = xml.IndexOf("</w:p>", lineP, StringComparison.Ordinal);
            if (lineEnd < 0)
                return xml;

            var paragraph = xml.Substring(lineP, lineEnd - lineP);
            // La X del lado empresa se deja: la firma va al lado derecho de esa X.
            paragraph = AsegurarKeepNext(paragraph);

            const string pPrClose = "</w:pPr>";
            var pPrEnd = paragraph.IndexOf(pPrClose, StringComparison.Ordinal);
            var insertAt = pPrEnd >= 0
                ? pPrEnd + pPrClose.Length
                : paragraph.IndexOf('>') + 1;

            paragraph = paragraph.Insert(insertAt, "<w:r>" + drawing + "</w:r>");
            return xml.Substring(0, lineP) + paragraph + xml.Substring(lineEnd);
        }

        private static string AsegurarKeepNext(string paragraph)
        {
            if (paragraph.Contains("<w:keepNext", StringComparison.Ordinal))
                return paragraph;

            const string pPrOpen = "<w:pPr>";
            var at = paragraph.IndexOf(pPrOpen, StringComparison.Ordinal);
            if (at >= 0)
                return paragraph.Insert(at + pPrOpen.Length, "<w:keepNext/>");

            var gt = paragraph.IndexOf('>');
            if (gt < 0)
                return paragraph;

            return paragraph.Insert(gt + 1, "<w:pPr><w:keepNext/></w:pPr>");
        }

        private static int LastIndexOfParagraphStart(string xml, int beforeIndex)
        {
            var a = xml.LastIndexOf("<w:p ", beforeIndex, StringComparison.Ordinal);
            var b = xml.LastIndexOf("<w:p>", beforeIndex, StringComparison.Ordinal);
            return Math.Max(a, b);
        }

        private static string AsegurarPngContentType(string xml)
        {
            if (Regex.IsMatch(xml, @"Extension\s*=\s*[""']png[""']", RegexOptions.IgnoreCase))
                return xml;

            return xml.Replace("</Types>",
                "<Default Extension=\"png\" ContentType=\"image/png\"/></Types>",
                StringComparison.OrdinalIgnoreCase);
        }

        private static string AsegurarRelacionImagen(string xml)
        {
            if (xml.Contains(RelId, StringComparison.Ordinal))
                return xml;

            const string rel =
                "<Relationship Id=\"" + RelId + "\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/image\" Target=\"media/firmaEmpresa.png\"/>";
            return xml.Replace("</Relationships>", rel + "</Relationships>", StringComparison.OrdinalIgnoreCase);
        }

        private static string ConstruirDrawing()
        {
            return
                "<w:drawing>" +
                "<wp:anchor distT=\"0\" distB=\"0\" distL=\"0\" distR=\"0\" simplePos=\"0\" " +
                "relativeHeight=\"251658240\" behindDoc=\"0\" locked=\"0\" layoutInCell=\"1\" allowOverlap=\"1\" " +
                "xmlns:wp=\"http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing\" " +
                "xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\" " +
                "xmlns:pic=\"http://schemas.openxmlformats.org/drawingml/2006/picture\" " +
                "xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\">" +
                "<wp:simplePos x=\"0\" y=\"0\"/>" +
                "<wp:positionH relativeFrom=\"column\"><wp:posOffset>" + PosXEmu + "</wp:posOffset></wp:positionH>" +
                "<wp:positionV relativeFrom=\"paragraph\"><wp:posOffset>" + PosYEmu + "</wp:posOffset></wp:positionV>" +
                $"<wp:extent cx=\"{CxEmu}\" cy=\"{CyEmu}\"/>" +
                "<wp:effectExtent l=\"0\" t=\"0\" r=\"0\" b=\"0\"/>" +
                "<wp:wrapNone/>" +
                "<wp:docPr id=\"9911\" name=\"FirmaEmpresa\"/>" +
                "<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect=\"1\"/></wp:cNvGraphicFramePr>" +
                "<a:graphic>" +
                "<a:graphicData uri=\"http://schemas.openxmlformats.org/drawingml/2006/picture\">" +
                "<pic:pic>" +
                "<pic:nvPicPr><pic:cNvPr id=\"0\" name=\"firmaEmpresa.png\"/><pic:cNvPicPr/></pic:nvPicPr>" +
                "<pic:blipFill>" +
                $"<a:blip r:embed=\"{RelId}\"/>" +
                "<a:stretch><a:fillRect/></a:stretch>" +
                "</pic:blipFill>" +
                "<pic:spPr>" +
                "<a:xfrm><a:off x=\"0\" y=\"0\"/>" +
                $"<a:ext cx=\"{CxEmu}\" cy=\"{CyEmu}\"/>" +
                "</a:xfrm>" +
                "<a:prstGeom prst=\"rect\"><a:avLst/></a:prstGeom>" +
                "</pic:spPr>" +
                "</pic:pic>" +
                "</a:graphicData>" +
                "</a:graphic>" +
                "</wp:anchor>" +
                "</w:drawing>";
        }
    }
}
