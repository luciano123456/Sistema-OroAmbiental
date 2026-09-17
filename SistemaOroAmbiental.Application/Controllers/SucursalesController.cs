using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.DAL.Common;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class SucursalesController : Controller
    {
        private readonly SistemaOroAmbientalContext _db;
        private readonly IUsuariosSucursalesService _usuariosSucursales;
        private readonly ICatalogoCascadeRepository _cascade;

        public SucursalesController(
            SistemaOroAmbientalContext db,
            IUsuariosSucursalesService usuariosSucursales,
            ICatalogoCascadeRepository cascade)
        {
            _db = db;
            _usuariosSucursales = usuariosSucursales;
            _cascade = cascade;
        }

        /// <summary>Sucursales permitidas para el usuario logueado (asignadas en Usuarios_Sucursales).</summary>
        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var idUsuario = ObtenerIdUsuarioActual();
            if (!idUsuario.HasValue)
                return Unauthorized();

            var items = await _usuariosSucursales.ListaParaUsuario(idUsuario.Value);
            var lista = items.Select(x => new VMGenericModel { Id = x.Id, Nombre = x.Nombre }).ToList();
            return Ok(lista);
        }

        /// <summary>Todas las sucursales (asignación en módulo Usuarios).</summary>
        [HttpGet]
        public async Task<IActionResult> ListaTodas()
        {
            var lista = await _db.Sucursales.AsNoTracking()
                .OrderBy(x => x.Nombre)
                .Select(x => new VMGenericModel { Id = x.Id, Nombre = x.Nombre })
                .ToListAsync();

            return Ok(lista);
        }

        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMGenericModel model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);

            var entity = new Sucursal
            {
                Nombre = model.Nombre ?? "",
                IdUsuarioRegistra = idUsuario,
                FechaUsuarioRegistra = DateTime.Now
            };

            _db.Sucursales.Add(entity);
            await _db.SaveChangesAsync();

            return Ok(new { valor = true, id = entity.Id });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMGenericModel model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);

            var entity = await _db.Sucursales.FirstOrDefaultAsync(x => x.Id == model.Id);
            if (entity == null)
                return NotFound();

            entity.Nombre = model.Nombre ?? "";
            entity.IdUsuarioModifica = idUsuario;
            entity.FechaUsuarioModifica = DateTime.Now;

            await _db.SaveChangesAsync();
            return Ok(new { valor = true });
        }

        [HttpGet]
        public async Task<IActionResult> DependenciasEliminar(int id)
        {
            var info = await _cascade.ObtenerDependenciasAsync<Sucursal>(id);
            return Ok(info);
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id, bool cascada = false)
        {
            try
            {
                var deps = await _cascade.ObtenerDependenciasAsync<Sucursal>(id);
                if (deps.TieneDependencias && !cascada)
                    return Ok(new { valor = false, mensaje = deps.MensajeResumen, tipo = "dependencias" });

                if (deps.TieneDependencias && cascada)
                {
                    if (!deps.PermiteCascada)
                        return Ok(new { valor = false, mensaje = deps.MensajeResumen, tipo = "relacion" });

                    await _cascade.EliminarEnCascadaAsync<Sucursal>(id);
                    return Ok(new
                    {
                        valor = true,
                        mensaje = "Sucursal eliminada. Los registros asociados se desvincularon o reasignaron.",
                        tipo = "success"
                    });
                }

                var entity = await _db.Sucursales.FirstOrDefaultAsync(x => x.Id == id);
                if (entity == null)
                    return Ok(new { valor = false, mensaje = "No se encontró la sucursal.", tipo = "validacion" });

                var nombre = entity.Nombre;
                _db.Sucursales.Remove(entity);
                await _db.SaveChangesAsync();
                await EliminacionLogAmbient.TryRegistrarAsync(
                    nameof(Sucursal),
                    id,
                    EliminacionLog.TipoSimple,
                    nombreEntidad: nombre);
                return Ok(new { valor = true, mensaje = "Sucursal eliminada correctamente.", tipo = "success" });
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
                    mensaje = "No se pudo eliminar la sucursal porque tiene registros relacionados.",
                    tipo = "relacion"
                });
            }
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var entity = await _db.Sucursales.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
            if (entity == null)
                return NotFound();

            return Ok(new VMGenericModel { Id = entity.Id, Nombre = entity.Nombre });
        }

        private int? ObtenerIdUsuarioActual()
        {
            var claim = User.FindFirst("Id")?.Value;
            return int.TryParse(claim, out var id) ? id : null;
        }
    }
}
