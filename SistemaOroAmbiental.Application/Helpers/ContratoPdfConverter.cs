using System.Diagnostics;

namespace SistemaOroAmbiental.Application.Helpers
{
    public static class ContratoPdfConverter
    {
        public static bool LibreOfficeDisponible => !string.IsNullOrEmpty(BuscarSoffice());

        public static async Task<byte[]> ConvertirDocxAPdfAsync(byte[] docxBytes, CancellationToken cancellationToken = default)
        {
            var soffice = BuscarSoffice();
            if (string.IsNullOrEmpty(soffice))
            {
                throw new InvalidOperationException(
                    "No se pudo convertir a PDF en el servidor. Use «Generar Word» o instale LibreOffice.");
            }

            var tempDir = Path.Combine(Path.GetTempPath(), "oro_contrato_" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(tempDir);

            try
            {
                var docxPath = Path.Combine(tempDir, "contrato.docx");
                await File.WriteAllBytesAsync(docxPath, docxBytes, cancellationToken);

                var psi = new ProcessStartInfo
                {
                    FileName = soffice,
                    Arguments = $"--headless --nologo --nofirststartwizard --convert-to pdf --outdir \"{tempDir}\" \"{docxPath}\"",
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true
                };

                using var proc = Process.Start(psi)
                    ?? throw new InvalidOperationException("No se pudo iniciar LibreOffice.");

                using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                cts.CancelAfter(TimeSpan.FromSeconds(120));
                await proc.WaitForExitAsync(cts.Token);

                var pdfPath = Path.ChangeExtension(docxPath, ".pdf");
                if (!File.Exists(pdfPath))
                {
                    throw new InvalidOperationException(
                        "LibreOffice no generó el PDF. Verifique la plantilla o use «Generar Word».");
                }

                return await File.ReadAllBytesAsync(pdfPath, cancellationToken);
            }
            finally
            {
                try
                {
                    if (Directory.Exists(tempDir))
                        Directory.Delete(tempDir, true);
                }
                catch
                {
                    // ignorar limpieza temp
                }
            }
        }

        private static string? BuscarSoffice()
        {
            var candidatos = new[]
            {
                @"C:\Program Files\LibreOffice\program\soffice.exe",
                @"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
                Environment.GetEnvironmentVariable("LIBREOFFICE_PATH")
            };

            foreach (var path in candidatos)
            {
                if (!string.IsNullOrWhiteSpace(path) && File.Exists(path))
                    return path;
            }

            var pathEnv = Environment.GetEnvironmentVariable("PATH") ?? "";
            foreach (var dir in pathEnv.Split(';', StringSplitOptions.RemoveEmptyEntries))
            {
                try
                {
                    var full = Path.Combine(dir.Trim(), "soffice.exe");
                    if (File.Exists(full))
                        return full;
                }
                catch
                {
                    // ignorar rutas inválidas
                }
            }

            return null;
        }
    }
}
