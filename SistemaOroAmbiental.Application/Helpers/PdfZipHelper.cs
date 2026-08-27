using System.IO.Compression;

namespace SistemaOroAmbiental.Application.Helpers
{
    public static class PdfZipHelper
    {
        public static byte[] CrearZip(params (string Nombre, byte[] Contenido)[] archivos)
        {
            using var ms = new MemoryStream();
            using (var zip = new ZipArchive(ms, ZipArchiveMode.Create, leaveOpen: true))
            {
                foreach (var (nombre, contenido) in archivos)
                {
                    if (contenido == null || contenido.Length == 0)
                        continue;
                    var entry = zip.CreateEntry(Sanitize(nombre), CompressionLevel.Fastest);
                    using var stream = entry.Open();
                    stream.Write(contenido, 0, contenido.Length);
                }
            }

            return ms.ToArray();
        }

        private static string Sanitize(string name)
        {
            foreach (var c in Path.GetInvalidFileNameChars())
                name = name.Replace(c, '_');
            return name.Trim();
        }
    }
}
