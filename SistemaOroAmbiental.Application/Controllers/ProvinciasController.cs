using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class ProvinciasController : ConfiguracionNombreControllerBase<Provincia>
    {
        public ProvinciasController(IConfiguracionNombreService<Provincia> service) : base(service) { }

        [AllowAnonymous]
        [HttpGet]
        public override async Task<IActionResult> Lista()
        {
            var items = (await Service.ObtenerTodos())
                .OrderBy(x => x.Nombre)
                .ToList();

            var lista = items.Select(p => new VMProvinciaGeo
            {
                Id = p.Id,
                Nombre = p.Nombre,
                Codigo = p.Codigo
            }).ToList();

            return Ok(lista);
        }

        [HttpPost]
        public override async Task<IActionResult> Insertar([FromBody] VMGenericModel model)
        {
            var entity = new Provincia
            {
                Nombre = model.Nombre?.Trim() ?? "",
                Codigo = model.Codigo?.Trim()
            };

            bool respuesta = await Service.Insertar(entity);

            return Ok(new { valor = respuesta, id = entity.Id });
        }

        [HttpPut]
        public override async Task<IActionResult> Actualizar([FromBody] VMGenericModel model)
        {
            var entity = await Service.Obtener(model.Id);
            if (entity == null)
                return NotFound();

            entity.Nombre = model.Nombre?.Trim() ?? "";
            entity.Codigo = model.Codigo?.Trim();

            bool respuesta = await Service.Actualizar(entity);

            return Ok(new { valor = respuesta });
        }

        [HttpGet]
        public override async Task<IActionResult> EditarInfo(int id)
        {
            var entity = await Service.Obtener(id);
            if (entity == null)
                return NotFound();

            return Ok(new VMProvinciaGeo
            {
                Id = entity.Id,
                Nombre = entity.Nombre,
                Codigo = entity.Codigo
            });
        }
    }
}
