using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaOroAmbiental.Application.Helpers;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class FirmasController : Controller
    {
        private readonly IFirmasService _service;
        private readonly FirmasFirmaStorage _firmas;

        public FirmasController(IFirmasService service, FirmasFirmaStorage firmas)
        {
            _service = service;
            _firmas = firmas;
        }

        [AllowAnonymous]
        public IActionResult Index()
        {
            return View();
        }

        [HttpGet]
        public async Task<IActionResult> Lista(bool soloActivos = false)
        {
            var items = (await _service.ObtenerTodos(soloActivos)).ToList();
            var lista = items.Select(MapLista).ToList();
            return Ok(lista);
        }

        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMFirma model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);
            var firma = new Firma
            {
                Nombre = (model.Nombre ?? "").Trim(),
                Activo = model.Activo,
                IdUsuarioRegistra = idUsuario,
                FechaUsuarioRegistra = DateTime.Now
            };

            ServiceResult result = await _service.Insertar(firma);
            if (result.Ok && !string.IsNullOrWhiteSpace(model.FirmaBase64))
            {
                firma.FirmaArchivo = await _firmas.GuardarAsync(firma.Id, model.FirmaBase64);
                firma.IdUsuarioModifica = idUsuario;
                firma.FechaUsuarioModifica = DateTime.Now;
                await _service.Actualizar(firma);
            }

            return Ok(new
            {
                id = firma.Id,
                valor = result.Ok,
                mensaje = result.Mensaje,
                tipo = result.Tipo
            });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMFirma model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);
            var actual = await _service.Obtener(model.Id);
            if (actual == null)
                return NotFound();

            if (model.QuitarFirma)
            {
                _firmas.Eliminar(model.Id);
                actual.FirmaArchivo = null;
            }
            else if (!string.IsNullOrWhiteSpace(model.FirmaBase64))
            {
                actual.FirmaArchivo = await _firmas.GuardarAsync(model.Id, model.FirmaBase64);
            }

            actual.Nombre = (model.Nombre ?? "").Trim();
            actual.Activo = model.Activo;
            actual.IdUsuarioModifica = idUsuario;
            actual.FechaUsuarioModifica = DateTime.Now;

            ServiceResult result = await _service.Actualizar(actual);
            return Ok(new
            {
                valor = result.Ok,
                mensaje = result.Mensaje,
                tipo = result.Tipo
            });
        }

        [HttpPost]
        public async Task<IActionResult> CambiarActivo([FromBody] VMActivoToggle model)
        {
            var result = await _service.CambiarActivo(model.Id, model.Activo);
            return Ok(new { valor = result.Ok, mensaje = result.Mensaje, tipo = result.Tipo });
        }

        [HttpGet]
        public async Task<IActionResult> DependenciasEliminar(int id)
        {
            var info = await _service.ObtenerDependenciasEliminar(id);
            return Ok(info);
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id, bool cascada = false)
        {
            var result = await _service.Eliminar(id, cascada);
            if (result.Ok)
                _firmas.Eliminar(id);

            return Ok(new
            {
                valor = result.Ok,
                mensaje = result.Mensaje,
                tipo = result.Tipo,
                idReferencia = result.IdReferencia,
                dependencias = result.Dependencias?.Items,
                instruccionesPasoAPaso = result.InstruccionesPasoAPaso
            });
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var c = await _service.Obtener(id);
            if (c == null)
                return NotFound();

            return Ok(MapLista(c));
        }

        [HttpGet]
        public async Task<IActionResult> Firma(int id)
        {
            var c = await _service.Obtener(id);
            if (c == null)
                return NotFound();

            var bytes = _firmas.LeerBytes(id);
            if (bytes == null)
                return NotFound();

            Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
            Response.Headers.Pragma = "no-cache";
            return File(bytes, "image/png");
        }

        private static VMFirma MapLista(Firma c) => new()
        {
            Id = c.Id,
            Nombre = c.Nombre,
            FirmaArchivo = c.FirmaArchivo,
            FirmaUrl = UrlFirma(c),
            Activo = c.Activo,
            IdUsuarioRegistra = c.IdUsuarioRegistra,
            FechaUsuarioRegistra = c.FechaUsuarioRegistra,
            UsuarioRegistra = c.IdUsuarioRegistraNavigation?.Usuario,
            IdUsuarioModifica = c.IdUsuarioModifica,
            FechaUsuarioModifica = c.FechaUsuarioModifica,
            UsuarioModifica = c.IdUsuarioModificaNavigation?.Usuario
        };

        private static string? UrlFirma(Firma c)
        {
            if (c == null || string.IsNullOrWhiteSpace(c.FirmaArchivo))
                return null;
            var stamp = (c.FechaUsuarioModifica ?? c.FechaUsuarioRegistra).Ticks;
            if (stamp <= 0)
                stamp = DateTime.Now.Ticks;
            return $"/Uploads/firmas/{c.Id}/firma.png?v={stamp}";
        }
    }
}
