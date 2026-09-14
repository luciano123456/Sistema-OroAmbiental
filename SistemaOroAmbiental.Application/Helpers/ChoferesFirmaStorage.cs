using System.Text.RegularExpressions;

namespace SistemaOroAmbiental.Application.Helpers
{
    public class ChoferesFirmaStorage
    {
        private readonly IWebHostEnvironment _env;

        public ChoferesFirmaStorage(IWebHostEnvironment env)
        {
            _env = env;
        }

        public string? RutaRelativa(int idChofer)
        {
            if (idChofer <= 0)
                return null;
            return $"/Uploads/choferes/{idChofer}/firma.png";
        }

        public string? RutaFisica(int idChofer)
        {
            if (idChofer <= 0)
                return null;
            return Path.Combine(_env.WebRootPath, "Uploads", "choferes", idChofer.ToString(), "firma.png");
        }

        public async Task<string?> GuardarAsync(int idChofer, string? dataUrlOBase64)
        {
            if (idChofer <= 0 || string.IsNullOrWhiteSpace(dataUrlOBase64))
                return null;

            var bytes = DecodeImagen(dataUrlOBase64);
            if (bytes == null || bytes.Length == 0)
                return null;

            var dir = Path.Combine(_env.WebRootPath, "Uploads", "choferes", idChofer.ToString());
            Directory.CreateDirectory(dir);
            var path = Path.Combine(dir, "firma.png");
            await File.WriteAllBytesAsync(path, bytes);
            return RutaRelativa(idChofer);
        }

        public byte[]? LeerBytes(int idChofer)
        {
            var path = RutaFisica(idChofer);
            if (string.IsNullOrWhiteSpace(path) || !File.Exists(path))
                return null;
            return File.ReadAllBytes(path);
        }

        public void Eliminar(int idChofer)
        {
            var path = RutaFisica(idChofer);
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
