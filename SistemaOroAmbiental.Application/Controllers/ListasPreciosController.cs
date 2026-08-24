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
        private readonly ICatalogoCascadeRepository _cascade;

        public ListasPreciosController(IListasPreciosService service, ICatalogoCascadeRepository cascade)
        {
            _service = service;
            _cascade = cascade;
        }

        [AllowAnonymous]
        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var items = (await _service.ObtenerTodos())
                .Include(x => x.IdTipoPagoNavigation)
                .OrderBy(x => x.Nombre)
                .Select(x => new VMGenericModelConfCombo
                {
                    Id = x.Id,
                    Nombre = x.Nombre,
                    IdCombo = x.IdTipoPago ?? 0,
                    NombreCombo = x.IdTipoPagoNavigation != null ? x.IdTipoPagoNavigation.Nombre : null,
                    Codigo = x.IdTipoPagoNavigation != null ? x.IdTipoPagoNavigation.Codigo : null
                })
                .ToList();

            return Ok(items);
        }

        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMGenericModelConfCombo model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);
            var nombre = (model.Nombre ?? "").Trim();

            if (string.IsNullOrWhiteSpace(nombre))
                return Ok(new { valor = false, mensaje = "El nombre es obligatorio." });

            var entity = new ListasPrecio
            {
                Nombre = nombre,
                IdTipoPago = model.IdCombo > 0 ? model.IdCombo : null,
                IdUsuarioRegistra = idUsuario,
                FechaUsuarioRegistra = DateTime.Now
            };

            var ok = await _service.Insertar(entity);
            return Ok(new { valor = ok, id = entity.Id, mensaje = ok ? "Registrado correctamente" : "No se pudo guardar" });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMGenericModelConfCombo model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);

            var entity = await _service.Obtener(model.Id);
            if (entity == null)
                return NotFound(new { valor = false });

            var nombre = (model.Nombre ?? "").Trim();
            if (string.IsNullOrWhiteSpace(nombre))
                return Ok(new { valor = false, mensaje = "El nombre es obligatorio." });

            entity.Nombre = nombre;
            entity.IdTipoPago = model.IdCombo > 0 ? model.IdCombo : null;
            entity.IdUsuarioModifica = idUsuario;
            entity.FechaUsuarioModifica = DateTime.Now;

            var ok = await _service.Actualizar(entity);
            return Ok(new { valor = ok, mensaje = ok ? "Modificado correctamente" : "No se pudo guardar" });
        }

        [HttpGet]
        public async Task<IActionResult> DependenciasEliminar(int id)
        {
            var info = await _cascade.ObtenerDependenciasAsync<ListasPrecio>(id);
            return Ok(info);
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id, bool cascada = false)
        {
            try
            {
                var deps = await _cascade.ObtenerDependenciasAsync<ListasPrecio>(id);
                if (deps.TieneDependencias && !cascada)
                    return Ok(new { valor = false, mensaje = deps.MensajeResumen, tipo = "dependencias" });

                if (deps.TieneDependencias && cascada)
                {
                    if (!deps.PermiteCascada)
                        return Ok(new { valor = false, mensaje = deps.MensajeResumen, tipo = "relacion" });

                    await _cascade.EliminarEnCascadaAsync<ListasPrecio>(id);
                    return Ok(new
                    {
                        valor = true,
                        mensaje = "Eliminado correctamente. Los registros asociados se desvincularon.",
                        tipo = "success"
                    });
                }

                var ok = await _service.Eliminar(id);
                return Ok(new
                {
                    valor = ok,
                    mensaje = ok ? "Eliminado correctamente" : "No se encontró el registro.",
                    tipo = ok ? "success" : "validacion"
                });
            }
            catch (InvalidOperationException ex)
            {
                return Ok(new { valor = false, mensaje = ex.Message, tipo = "relacion" });
            }
            catch (DbUpdateException)
            {
                return Ok(new
                {
                    valor = false,
                    mensaje = "No se pudo eliminar porque tiene registros relacionados.",
                    tipo = "relacion"
                });
            }
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var entity = await _service.Obtener(id);
            if (entity == null)
                return NotFound();

            return Ok(new VMGenericModelConfCombo
            {
                Id = entity.Id,
                Nombre = entity.Nombre,
                IdCombo = entity.IdTipoPago ?? 0
            });
        }
    }
}
