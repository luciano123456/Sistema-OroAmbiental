using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class ClientesTiposGeneradorController : ConfiguracionNombreControllerBase<ClientesTipoGenerador>
    {
        public ClientesTiposGeneradorController(IConfiguracionNombreService<ClientesTipoGenerador> service) : base(service) { }

        [AllowAnonymous]
        [HttpGet]
        public override async Task<IActionResult> Lista()
        {
            var items = (await Service.ObtenerTodos())
                .OrderBy(x => x.Codigo)
                .ThenBy(x => x.Nombre)
                .ToList();

            var lista = items.Select(x => new
            {
                x.Id,
                x.Nombre,
                x.Codigo,
                Etiqueta = x.Codigo + " - " + x.Nombre
            }).ToList();

            return Ok(lista);
        }

        [HttpPost]
        public override async Task<IActionResult> Insertar([FromBody] VMGenericModel model)
        {
            var codigo = NormalizarCodigo(model.Codigo);
            if (codigo == null)
                return Ok(new { valor = false, mensaje = "El código es obligatorio (máx. 2 caracteres, para archivo TXT)." });

            var nombre = model.Nombre?.Trim() ?? "";
            if (string.IsNullOrWhiteSpace(nombre))
                return Ok(new { valor = false, mensaje = "El nombre es obligatorio." });

            if (await CodigoDuplicado(null, codigo))
                return Ok(new { valor = false, mensaje = "Ya existe un tipo de generador con ese código." });

            var entity = new ClientesTipoGenerador
            {
                Codigo = codigo,
                Nombre = nombre
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

            var codigo = NormalizarCodigo(model.Codigo);
            if (codigo == null)
                return Ok(new { valor = false, mensaje = "El código es obligatorio (máx. 2 caracteres, para archivo TXT)." });

            var nombre = model.Nombre?.Trim() ?? "";
            if (string.IsNullOrWhiteSpace(nombre))
                return Ok(new { valor = false, mensaje = "El nombre es obligatorio." });

            if (await CodigoDuplicado(model.Id, codigo))
                return Ok(new { valor = false, mensaje = "Ya existe un tipo de generador con ese código." });

            entity.Codigo = codigo;
            entity.Nombre = nombre;

            bool respuesta = await Service.Actualizar(entity);

            return Ok(new { valor = respuesta });
        }

        [HttpGet]
        public override async Task<IActionResult> EditarInfo(int id)
        {
            var entity = await Service.Obtener(id);
            if (entity == null)
                return NotFound();

            return Ok(new VMGenericModel
            {
                Id = entity.Id,
                Nombre = entity.Nombre,
                Codigo = entity.Codigo
            });
        }

        private static string? NormalizarCodigo(string? codigo)
        {
            var txt = (codigo ?? "").Trim();
            if (string.IsNullOrEmpty(txt) || txt.Length > 2)
                return null;
            return txt;
        }

        private async Task<bool> CodigoDuplicado(int? idExcluir, string codigo)
        {
            var query = (await Service.ObtenerTodos())
                .Where(x => x.Codigo == codigo);

            if (idExcluir.HasValue)
                query = query.Where(x => x.Id != idExcluir.Value);

            return await query.AnyAsync();
        }
    }
}
