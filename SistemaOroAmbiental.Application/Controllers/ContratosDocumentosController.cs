using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.Application.Helpers;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class ContratosDocumentosController : Controller
    {
        private readonly IContratosDocumentosRepository _repo;
        private readonly IContratosRepository _contratosRepo;
        private readonly IWebHostEnvironment _env;

        public ContratosDocumentosController(
            IContratosDocumentosRepository repo,
            IContratosRepository contratosRepo,
            IWebHostEnvironment env)
        {
            _repo = repo;
            _contratosRepo = contratosRepo;
            _env = env;
        }

        private string GeneradosFolderPath(int idContrato)
        {
            var dir = Path.Combine(_env.ContentRootPath, "Contratos", "Generados", idContrato.ToString());
            if (!Directory.Exists(dir))
                Directory.CreateDirectory(dir);
            return dir;
        }

        private static string SanitizeFileName(string name)
        {
            foreach (var c in Path.GetInvalidFileNameChars())
                name = name.Replace(c, '_');
            return name.Trim();
        }

        private string PlantillaPath(int idTipoContrato)
            => Path.Combine(_env.ContentRootPath, "Contratos", "Plantillas", $"{idTipoContrato}.docx");

        /// <summary>Genera Word en el servidor (no bloquea el navegador).</summary>
        [HttpPost]
        public async Task<IActionResult> Generar(int idContrato, int idTipoContrato, string formato, CancellationToken cancellationToken)
        {
            if (idContrato <= 0)
                return Ok(new { valor = false, mensaje = "Contrato inválido.", tipo = "validacion" });

            if (idTipoContrato <= 0)
                return Ok(new { valor = false, mensaje = "Seleccione el tipo de contrato (plantilla).", tipo = "validacion" });

            var plantillaPath = PlantillaPath(idTipoContrato);
            if (!System.IO.File.Exists(plantillaPath))
            {
                return Ok(new
                {
                    valor = false,
                    mensaje = "No existe plantilla .docx para este tipo. Subala en Configuraciones → Plantillas Word.",
                    tipo = "validacion"
                });
            }

            var contrato = await _contratosRepo.Obtener(idContrato);
            if (contrato == null)
                return Ok(new { valor = false, mensaje = "Contrato no encontrado.", tipo = "validacion" });

            try
            {
                var datosVm = ContratoPlantillaMapper.Map(contrato);
                var campos = ContratoPlantillaMapper.ToCamposDocx(datosVm);
                var nombreBase = ContratoPlantillaMapper.BuildNombreArchivo(datosVm);

                var plantillaBytes = await System.IO.File.ReadAllBytesAsync(plantillaPath, cancellationToken);
                var docxBytes = ContratoDocxGenerator.CompletarPlantilla(plantillaBytes, campos);

                var pendientes = ContratoDocxGenerator.ListarEtiquetasPendientes(docxBytes);
                if (pendientes.Count > 0)
                {
                    var lista = string.Join(", ", pendientes.Take(8));
                    var mas = pendientes.Count > 8 ? $" (+{pendientes.Count - 8})" : "";
                    return Ok(new
                    {
                        valor = false,
                        mensaje = "La plantilla tiene campos sin datos o mal escritos. Use solo llaves {CAMPO}, por ejemplo {NOMBRECLIENTE}. Pendientes: " + lista + mas,
                        tipo = "validacion"
                    });
                }

                var fmt = (formato ?? "word").Trim().ToLowerInvariant();
                if (fmt == "pdf")
                {
                    return Ok(new
                    {
                        valor = false,
                        mensaje = "La generación en PDF no está disponible. Use «Generar Word».",
                        tipo = "validacion"
                    });
                }

                byte[] archivoBytes = docxBytes;
                const string ext = ".docx";

                int idUsuario = int.Parse(User.FindFirst("Id")!.Value);
                var nombreAmigable = $"{nombreBase}{ext}";
                var fileNameDisk = $"{DateTime.Now:yyyyMMdd_HHmmss}_{nombreBase}{ext}";
                var dir = GeneradosFolderPath(idContrato);
                var fullPath = Path.Combine(dir, fileNameDisk);

                await using (var fs = new FileStream(fullPath, FileMode.Create, FileAccess.Write, FileShare.None))
                {
                    await fs.WriteAsync(archivoBytes, cancellationToken);
                }

                var rel = Path.Combine("Contratos", "Generados", idContrato.ToString(), fileNameDisk)
                    .Replace('\\', '/');

                var doc = new ContratosDocumento
                {
                    IdContrato = idContrato,
                    IdTipoContrato = idTipoContrato > 0 ? idTipoContrato : contrato.IdTipoContrato,
                    NombreArchivo = nombreAmigable,
                    RutaRelativa = rel,
                    Extension = ext,
                    TamanioBytes = archivoBytes.Length,
                    Formato = fmt == "word" || fmt == "docx" ? "word" : "pdf",
                    IdUsuarioRegistra = idUsuario,
                    FechaUsuarioRegistra = DateTime.Now
                };

                await _repo.Insertar(doc);

                return Ok(new
                {
                    valor = true,
                    mensaje = "Contrato Word generado y adjuntado.",
                    tipo = "ok",
                    id = doc.Id,
                    nombreArchivo = nombreAmigable
                });
            }
            catch (InvalidOperationException ex)
            {
                return Ok(new { valor = false, mensaje = ex.Message, tipo = "validacion" });
            }
            catch (Exception)
            {
                return Ok(new { valor = false, mensaje = "No se pudo generar el documento.", tipo = "error" });
            }
        }

        [HttpGet]
        public async Task<IActionResult> Lista(int idContrato)
        {
            if (idContrato <= 0)
                return BadRequest();

            var lista = await _repo.ListarPorContrato(idContrato);
            return Ok(lista.Select(d => new VMContratoDocumentoItem
            {
                Id = d.Id,
                IdContrato = d.IdContrato,
                IdTipoContrato = d.IdTipoContrato,
                TipoContrato = d.IdTipoContratoNavigation?.Nombre,
                NombreArchivo = d.NombreArchivo,
                Extension = d.Extension,
                Formato = d.Formato,
                TamanioBytes = d.TamanioBytes,
                FechaUsuarioRegistra = d.FechaUsuarioRegistra,
                Usuario = d.IdUsuarioRegistraNavigation?.Usuario
            }));
        }

        [HttpGet]
        public async Task<IActionResult> Descargar(int id)
        {
            var doc = await _repo.Obtener(id);
            if (doc == null)
                return NotFound();

            var fullPath = Path.Combine(_env.ContentRootPath, doc.RutaRelativa.Replace('/', Path.DirectorySeparatorChar));
            if (!System.IO.File.Exists(fullPath))
                return NotFound(new { valor = false, mensaje = "El archivo no existe en el servidor." });

            var contentType = doc.Extension.ToLowerInvariant() switch
            {
                ".pdf" => "application/pdf",
                ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                _ => "application/octet-stream"
            };

            return PhysicalFile(fullPath, contentType, doc.NombreArchivo);
        }

        [HttpPost]
        [RequestSizeLimit(50_000_000)]
        public async Task<IActionResult> Guardar(
            int idContrato,
            int? idTipoContrato,
            string formato,
            IFormFile file)
        {
            if (idContrato <= 0)
                return Ok(new { valor = false, mensaje = "Contrato inválido.", tipo = "validacion" });

            var contrato = await _contratosRepo.Obtener(idContrato);
            if (contrato == null)
                return Ok(new { valor = false, mensaje = "Contrato no encontrado.", tipo = "validacion" });

            if (file == null || file.Length == 0)
                return Ok(new { valor = false, mensaje = "Debe enviar el archivo generado.", tipo = "validacion" });

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (ext != ".pdf" && ext != ".docx")
                return Ok(new { valor = false, mensaje = "Solo .pdf o .docx.", tipo = "validacion" });

            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);
            var fmt = (formato ?? ext.TrimStart('.')).ToLowerInvariant();
            var nombre = SanitizeFileName(Path.GetFileNameWithoutExtension(file.FileName));
            if (string.IsNullOrWhiteSpace(nombre))
                nombre = $"CONTRATO_{idContrato}";

            var nombreAmigable = $"{nombre}{ext}";
            var fileName = $"{DateTime.Now:yyyyMMdd_HHmmss}_{nombre}{ext}";
            var dir = GeneradosFolderPath(idContrato);
            var fullPath = Path.Combine(dir, fileName);

            try
            {
                await using (var fs = new FileStream(fullPath, FileMode.Create, FileAccess.Write, FileShare.None))
                {
                    await file.CopyToAsync(fs);
                }

                var rel = Path.Combine("Contratos", "Generados", idContrato.ToString(), fileName)
                    .Replace('\\', '/');

                var doc = new ContratosDocumento
                {
                    IdContrato = idContrato,
                    IdTipoContrato = idTipoContrato > 0 ? idTipoContrato : contrato.IdTipoContrato,
                    NombreArchivo = nombreAmigable,
                    RutaRelativa = rel,
                    Extension = ext,
                    TamanioBytes = file.Length,
                    Formato = fmt,
                    IdUsuarioRegistra = idUsuario,
                    FechaUsuarioRegistra = DateTime.Now
                };

                await _repo.Insertar(doc);

                return Ok(new
                {
                    valor = true,
                    mensaje = "Documento guardado y adjunto al contrato.",
                    tipo = "ok",
                    id = doc.Id,
                    idReferencia = doc.Id
                });
            }
            catch
            {
                return Ok(new { valor = false, mensaje = "No se pudo guardar el documento.", tipo = "error" });
            }
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            var doc = await _repo.Obtener(id);
            if (doc == null)
                return Ok(new { valor = false, mensaje = "Documento no encontrado.", tipo = "validacion" });

            try
            {
                var fullPath = Path.Combine(_env.ContentRootPath, doc.RutaRelativa.Replace('/', Path.DirectorySeparatorChar));
                if (System.IO.File.Exists(fullPath))
                    System.IO.File.Delete(fullPath);

                await _repo.Eliminar(id);
                return Ok(new { valor = true, mensaje = "Documento eliminado.", tipo = "ok" });
            }
            catch
            {
                return Ok(new { valor = false, mensaje = "No se pudo eliminar.", tipo = "error" });
            }
        }
    }
}
