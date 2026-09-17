using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.DAL.Common;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class CuentasController : Controller
    {
        private readonly SistemaOroAmbientalContext _db;
        private readonly ICatalogoCascadeRepository _cascade;

        public CuentasController(SistemaOroAmbientalContext db, ICatalogoCascadeRepository cascade)
        {
            _db = db;
            _cascade = cascade;
        }

        [AllowAnonymous]
        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var lista = await _db.Cuentas.AsNoTracking()
                .Include(x => x.IdSucursalNavigation)
                .OrderBy(x => x.Nombre)
                .Select(x => new VMGenericModelConfCombo
                {
                    Id = x.Id,
                    IdCombo = x.IdSucursal,
                    Nombre = x.Nombre,
                    NombreCombo = x.IdSucursalNavigation.Nombre,
                    Codigo = x.TipoCuenta
                })
                .ToListAsync();

            return Ok(lista);
        }

        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMGenericModelConfCombo model)
        {
            var entity = new Cuenta
            {
                Nombre = model.Nombre ?? "",
                IdSucursal = model.IdCombo,
                TipoCuenta = NormalizarTipoCuenta(model.Codigo)
            };

            _db.Cuentas.Add(entity);
            await _db.SaveChangesAsync();

            return Ok(new { valor = true, id = entity.Id });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMGenericModelConfCombo model)
        {
            var entity = await _db.Cuentas.FirstOrDefaultAsync(x => x.Id == model.Id);
            if (entity == null)
                return NotFound();

            entity.Nombre = model.Nombre ?? "";
            entity.IdSucursal = model.IdCombo;
            entity.TipoCuenta = NormalizarTipoCuenta(model.Codigo);

            await _db.SaveChangesAsync();
            return Ok(new { valor = true });
        }

        [HttpGet]
        public async Task<IActionResult> DependenciasEliminar(int id)
        {
            var info = await _cascade.ObtenerDependenciasAsync<Cuenta>(id);
            return Ok(info);
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id, bool cascada = false)
        {
            try
            {
                var deps = await _cascade.ObtenerDependenciasAsync<Cuenta>(id);
                if (deps.TieneDependencias && !cascada)
                    return Ok(new { valor = false, mensaje = deps.MensajeResumen, tipo = "dependencias" });

                if (deps.TieneDependencias && cascada)
                {
                    if (!deps.PermiteCascada)
                        return Ok(new { valor = false, mensaje = deps.MensajeResumen, tipo = "relacion" });

                    await _cascade.EliminarEnCascadaAsync<Cuenta>(id);
                    return Ok(new
                    {
                        valor = true,
                        mensaje = "Cuenta eliminada. Los registros asociados se reasignaron.",
                        tipo = "success"
                    });
                }

                var entity = await _db.Cuentas.FirstOrDefaultAsync(x => x.Id == id);
                if (entity == null)
                    return Ok(new { valor = false, mensaje = "No se encontró la cuenta.", tipo = "validacion" });

                var nombre = entity.Nombre;
                _db.Cuentas.Remove(entity);
                await _db.SaveChangesAsync();
                await EliminacionLogAmbient.TryRegistrarAsync(
                    nameof(Cuenta),
                    id,
                    EliminacionLog.TipoSimple,
                    nombreEntidad: nombre);
                return Ok(new { valor = true, mensaje = "Cuenta eliminada correctamente.", tipo = "success" });
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
                    mensaje = "No se pudo eliminar la cuenta porque tiene registros relacionados.",
                    tipo = "relacion"
                });
            }
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var entity = await _db.Cuentas.AsNoTracking()
                .Include(x => x.IdSucursalNavigation)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (entity == null)
                return NotFound();

            return Ok(new VMGenericModelConfCombo
            {
                Id = entity.Id,
                IdCombo = entity.IdSucursal,
                Nombre = entity.Nombre,
                NombreCombo = entity.IdSucursalNavigation.Nombre,
                Codigo = entity.TipoCuenta
            });
        }

        private static string NormalizarTipoCuenta(string? tipo)
            => string.Equals(tipo, "Banco", StringComparison.OrdinalIgnoreCase) ? "Banco" : "Efectivo";
    }
}
