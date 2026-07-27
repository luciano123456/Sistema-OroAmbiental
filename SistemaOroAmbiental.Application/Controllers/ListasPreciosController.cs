using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class ListasPreciosController : Controller
    {
        private readonly IListasPreciosService _service;
        private readonly IDeleteConflictChecker _deleteChecker;

        public ListasPreciosController(IListasPreciosService service, IDeleteConflictChecker deleteChecker)
        {
            _service = service;
            _deleteChecker = deleteChecker;
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
            var bloqueo = await _deleteChecker.ListaPrecioAsync(id);
            if (!string.IsNullOrWhiteSpace(bloqueo))
                return Ok(new { valor = false, mensaje = bloqueo, tipo = "relacion" });

            try
            {
                var ok = await _service.Eliminar(id);
                return Ok(new
                {
                    valor = ok,
                    mensaje = ok ? "Eliminado correctamente" : "No se encontró el registro.",
                    tipo = ok ? "success" : "validacion"
                });
            }
            catch (DbUpdateException)
            {
                var msg = await _deleteChecker.ListaPrecioAsync(id)
                    ?? "No se pudo eliminar porque tiene registros relacionados.";
                return Ok(new { valor = false, mensaje = msg, tipo = "relacion" });
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
