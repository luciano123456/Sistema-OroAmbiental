using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class CamionesController : Controller
    {
        private readonly ICamionesService _service;

        public CamionesController(ICamionesService service)
        {
            _service = service;
        }

        [AllowAnonymous]
        public IActionResult Index()
        {
            return View();
        }

        [HttpGet]
        public async Task<IActionResult> Lista(bool soloActivos = false)
        {
            var camiones = (await _service.ObtenerTodos(soloActivos)).ToList();

            var lista = camiones.Select(c => new VMCamion
            {
                Id = c.Id,
                Activo = c.Activo,
                Nombre = c.Nombre,
                IdUsuarioRegistra = c.IdUsuarioRegistra,
                FechaUsuarioRegistra = c.FechaUsuarioRegistra,
                UsuarioRegistra = c.IdUsuarioRegistraNavigation?.Usuario,
                IdUsuarioModifica = c.IdUsuarioModifica,
                FechaUsuarioModifica = c.FechaUsuarioModifica,
                UsuarioModifica = c.IdUsuarioModificaNavigation?.Usuario
            }).ToList();

            return Ok(lista);
        }

        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMCamion model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);

            var camion = new Camion
            {
                Nombre = model.Nombre,
                Activo = model.Activo,
                IdUsuarioRegistra = idUsuario,
                FechaUsuarioRegistra = DateTime.Now
            };

            ServiceResult result = await _service.Insertar(camion);

            return Ok(new
            {
                id = camion.Id,
                valor = result.Ok,
                mensaje = result.Mensaje,
                tipo = result.Tipo,
                idReferencia = result.IdReferencia
            });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMCamion model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);

            var camion = new Camion
            {
                Id = model.Id,
                Nombre = model.Nombre,
                Activo = model.Activo,
                IdUsuarioModifica = idUsuario,
                FechaUsuarioModifica = DateTime.Now
            };

            ServiceResult result = await _service.Actualizar(camion);

            return Ok(new
            {
                valor = result.Ok,
                mensaje = result.Mensaje,
                tipo = result.Tipo,
                idReferencia = result.IdReferencia
            });
        }

        [HttpPost]
        public async Task<IActionResult> CambiarActivo([FromBody] VMActivoToggle model)
        {
            var result = await _service.CambiarActivo(model.Id, model.Activo);
            return Ok(new
            {
                valor = result.Ok,
                mensaje = result.Mensaje,
                tipo = result.Tipo
            });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            ServiceResult result = await _service.Eliminar(id);

            return Ok(new
            {
                valor = result.Ok,
                mensaje = result.Mensaje,
                tipo = result.Tipo,
                idReferencia = result.IdReferencia
            });
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var c = await _service.Obtener(id);

            if (c == null)
                return NotFound();

            return Ok(new
            {
                c.Id,
                c.Nombre,
                c.Activo,
                c.FechaUsuarioRegistra,
                UsuarioRegistra = c.IdUsuarioRegistraNavigation?.Usuario,
                c.FechaUsuarioModifica,
                UsuarioModifica = c.IdUsuarioModificaNavigation?.Usuario
            });
        }
    }
}
