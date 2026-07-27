using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class PartidosController : Controller
    {
        private readonly IPartidosService _service;

        public PartidosController(IPartidosService service)
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

        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMPartido model)
        {
            var entity = new Partido
            {
                Codigo = model.Codigo?.Trim() ?? "",
                Nombre = model.Nombre?.Trim() ?? "",
                IdProvincia = model.IdProvincia
            };

            bool respuesta = await _service.Insertar(entity);

            return Ok(new { valor = respuesta, id = entity.Id });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMPartido model)
        {
            var entity = await _service.Obtener(model.Id);
            if (entity == null)
                return NotFound();

            entity.Codigo = model.Codigo?.Trim() ?? "";
            entity.Nombre = model.Nombre?.Trim() ?? "";
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

        private static VMPartido MapToVm(Partido entity)
            => new()
            {
                Id = entity.Id,
                Codigo = entity.Codigo,
                Nombre = entity.Nombre,
                IdProvincia = entity.IdProvincia
            };
    }
}
