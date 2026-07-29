using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class CuentasController : Controller
    {
        private readonly SistemaOroAmbientalContext _db;
        private readonly IDeleteConflictChecker _deleteChecker;

        public CuentasController(SistemaOroAmbientalContext db, IDeleteConflictChecker deleteChecker)
        {
            _db = db;
            _deleteChecker = deleteChecker;
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

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            var bloqueo = await _deleteChecker.CuentaAsync(id);
            if (!string.IsNullOrWhiteSpace(bloqueo))
                return Ok(new { valor = false, mensaje = bloqueo, tipo = "relacion" });

            var entity = await _db.Cuentas.FirstOrDefaultAsync(x => x.Id == id);
            if (entity == null)
                return Ok(new { valor = false, mensaje = "No se encontró la cuenta.", tipo = "validacion" });

            try
            {
                _db.Cuentas.Remove(entity);
                await _db.SaveChangesAsync();
                return Ok(new { valor = true, mensaje = "Cuenta eliminada correctamente.", tipo = "success" });
            }
            catch (DbUpdateException)
            {
                var msg = await _deleteChecker.CuentaAsync(id)
                    ?? "No se pudo eliminar la cuenta porque tiene registros relacionados.";
                return Ok(new { valor = false, mensaje = msg, tipo = "relacion" });
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
