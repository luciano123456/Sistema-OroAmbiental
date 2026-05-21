using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class ListasPreciosController : Controller
    {
        private readonly IListasPreciosService _service;

        public ListasPreciosController(IListasPreciosService service)
        {
            _service = service;
        }

        [AllowAnonymous]
        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var items = (await _service.ObtenerTodos())
                .OrderBy(x => x.Nombre)
                .Select(x => new VMGenericModel { Id = x.Id, Nombre = x.Nombre })
                .ToList();

            return Ok(items);
        }

        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMGenericModel model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);

            var entity = new ListasPrecio
            {
                Nombre = (model.Nombre ?? "").Trim(),
                IdUsuarioRegistra = idUsuario,
                FechaUsuarioRegistra = DateTime.Now
            };

            if (string.IsNullOrWhiteSpace(entity.Nombre))
                return Ok(new { valor = false, mensaje = "El nombre es obligatorio." });

            var ok = await _service.Insertar(entity);

            return Ok(new { valor = ok, id = entity.Id, mensaje = ok ? "Registrado correctamente" : "No se pudo guardar" });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMGenericModel model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);

            var entity = await _service.Obtener(model.Id);
            if (entity == null)
                return NotFound(new { valor = false });

            entity.Nombre = (model.Nombre ?? "").Trim();
            entity.IdUsuarioModifica = idUsuario;
            entity.FechaUsuarioModifica = DateTime.Now;

            if (string.IsNullOrWhiteSpace(entity.Nombre))
                return Ok(new { valor = false, mensaje = "El nombre es obligatorio." });

            var ok = await _service.Actualizar(entity);

            return Ok(new { valor = ok, mensaje = ok ? "Modificado correctamente" : "No se pudo guardar" });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            try
            {
                var ok = await _service.Eliminar(id);
                return Ok(new { valor = ok, mensaje = ok ? "Eliminado correctamente" : "No se encontró el registro" });
            }
            catch (DbUpdateException)
            {
                return Ok(new
                {
                    valor = false,
                    mensaje = "No se puede eliminar porque tiene productos o clientes asociados."
                });
            }
            catch
            {
                return Ok(new { valor = false, mensaje = "Error al eliminar" });
            }
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var entity = await _service.Obtener(id);
            if (entity == null)
                return NotFound();

            return Ok(new VMGenericModel { Id = entity.Id, Nombre = entity.Nombre });
        }
    }
}
