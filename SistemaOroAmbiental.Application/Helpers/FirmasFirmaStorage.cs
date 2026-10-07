using System.Text.RegularExpressions;

namespace SistemaOroAmbiental.Application.Helpers
{
    public class FirmasFirmaStorage
    {
        private readonly IWebHostEnvironment _env;

        public FirmasFirmaStorage(IWebHostEnvironment env)
        {
            _env = env;
        }

        public string? RutaRelativa(int idFirma)
        {
            if (idFirma <= 0)
                return null;
            return $"/Uploads/firmas/{idFirma}/firma.png";
        }

        public string? RutaFisica(int idFirma)
        {
            if (idFirma <= 0)
                return null;
            return Path.Combine(_env.WebRootPath, "Uploads", "firmas", idFirma.ToString(), "firma.png");
        }

        public async Task<string?> GuardarAsync(int idFirma, string? dataUrlOBase64)
        {
            if (idFirma <= 0 || string.IsNullOrWhiteSpace(dataUrlOBase64))
                return null;

            var bytes = DecodeImagen(dataUrlOBase64);
            if (bytes == null || bytes.Length == 0)
                return null;

            var dir = Path.Combine(_env.WebRootPath, "Uploads", "firmas", idFirma.ToString());
            Directory.CreateDirectory(dir);
            var path = Path.Combine(dir, "firma.png");
            await File.WriteAllBytesAsync(path, bytes);
            return RutaRelativa(idFirma);
        }

        public byte[]? LeerBytes(int idFirma)
        {
            var path = RutaFisica(idFirma);
            if (string.IsNullOrWhiteSpace(path) || !File.Exists(path))
                return null;
            return File.ReadAllBytes(path);
        }

        public void Eliminar(int idFirma)
        {
            var path = RutaFisica(idFirma);
            if (!string.IsNullOrWhiteSpace(path) && File.Exists(path))
                File.Delete(path);
        }

        private static byte[]? DecodeImagen(string raw)
        {
            var s = raw.Trim();
            var m = Regex.Match(s, @"^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$", RegexOptions.IgnoreCase);
            if (m.Success)
                s = m.Groups[1].Value;

            try
            {
                return Convert.FromBase64String(s);
            }
            catch
            {
                return null;
            }
        }
    }
}
