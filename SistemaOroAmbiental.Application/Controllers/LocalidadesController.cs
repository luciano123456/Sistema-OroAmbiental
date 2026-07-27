using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class LocalidadesController : Controller
    {
        private readonly ILocalidadesService _service;

        public LocalidadesController(ILocalidadesService service)
        {
            _service = service;
        }

        [AllowAnonymous]
        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var items = (await _service.ObtenerTodos())
                .OrderBy(x => x.Nombre)
                .ToList();

            return Ok(items.Select(MapToVm).ToList());
        }

        [AllowAnonymous]
        [HttpGet]
        public async Task<IActionResult> ListaPorProvincia(int idProvincia)
        {
            var items = (await _service.ObtenerPorProvincia(idProvincia))
                .OrderBy(x => x.Nombre)
                .ToList();

            return Ok(items.Select(MapToVm).ToList());
        }

        [AllowAnonymous]
        [HttpGet]
        public async Task<IActionResult> ListaPorPartido(int idPartido)
        {
            var items = (await _service.ObtenerPorPartido(idPartido))
                .OrderBy(x => x.Nombre)
                .ToList();

            return Ok(items.Select(MapToVm).ToList());
        }

        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMLocalidad model)
        {
            var entity = new Localidad
            {
                Codigo = model.Codigo?.Trim() ?? "",
                Nombre = model.Nombre?.Trim() ?? "",
                IdPartido = model.IdPartido,
                IdProvincia = model.IdProvincia
            };

            bool respuesta = await _service.Insertar(entity);

            return Ok(new { valor = respuesta, id = entity.Id });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMLocalidad model)
        {
            var entity = await _service.Obtener(model.Id);
            if (entity == null)
                return NotFound();

            entity.Codigo = model.Codigo?.Trim() ?? "";
            entity.Nombre = model.Nombre?.Trim() ?? "";
            entity.IdPartido = model.IdPartido;
            entity.IdProvincia = model.IdProvincia;

            bool respuesta = await _service.Actualizar(entity);

            return Ok(new { valor = respuesta });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            var result = await _service.Eliminar(id);

            return Ok(new
            {
                valor = result.Ok,
                mensaje = result.Mensaje,
                tipo = result.Tipo
            });
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var entity = await _service.Obtener(id);
            if (entity == null)
                return NotFound();

            return Ok(MapToVm(entity));
        }

        private static VMLocalidad MapToVm(Localidad entity)
            => new()
            {
                Id = entity.Id,
                Codigo = entity.Codigo,
                Nombre = entity.Nombre,
                IdPartido = entity.IdPartido,
                IdProvincia = entity.IdProvincia
            };
    }
}
