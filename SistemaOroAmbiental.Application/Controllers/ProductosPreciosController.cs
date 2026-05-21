using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;
using System.Globalization;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class ProductosPreciosController : Controller
    {
        private readonly SistemaOroAmbientalContext _db;

        public ProductosPreciosController(SistemaOroAmbientalContext db)
        {
            _db = db;
        }

        [AllowAnonymous]
        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var lista = await _db.ProductosPrecios.AsNoTracking()
                .Include(x => x.IdProductoNavigation)
                .Include(x => x.IdListaPrecioNavigation)
                .OrderBy(x => x.IdProductoNavigation.Nombre)
                .Select(x => new VMGenericModelConfCombo
                {
                    Id = x.Id,
                    IdCombo = x.IdProducto,
                    Nombre = x.PrecioVenta.ToString("N2", CultureInfo.GetCultureInfo("es-AR")),
                    NombreCombo = x.IdProductoNavigation.Nombre + " - " + x.IdListaPrecioNavigation.Nombre
                })
                .ToListAsync();

            return Ok(lista);
        }

        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMGenericModelConfCombo model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);

            if (!decimal.TryParse(model.Nombre?.Replace(",", "."), NumberStyles.Any, CultureInfo.InvariantCulture, out var precio))
                return Ok(new { valor = false });

            var idLista = await _db.ListasPrecios.AsNoTracking()
                .OrderBy(x => x.Id)
                .Select(x => x.Id)
                .FirstOrDefaultAsync();

            if (idLista == 0 || model.IdCombo <= 0)
                return Ok(new { valor = false });

            var entity = new ProductosPrecio
            {
                IdProducto = model.IdCombo,
                IdListaPrecio = idLista,
                PrecioVenta = precio,
                PorcRentabilidad = 0,
                IdUsuarioRegistra = idUsuario,
                FechaUsuarioRegistra = DateTime.Now
            };

            _db.ProductosPrecios.Add(entity);
            await _db.SaveChangesAsync();

            return Ok(new { valor = true, id = entity.Id });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMGenericModelConfCombo model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);

            if (!decimal.TryParse(model.Nombre?.Replace(",", "."), NumberStyles.Any, CultureInfo.InvariantCulture, out var precio))
                return Ok(new { valor = false });

            var entity = await _db.ProductosPrecios.FirstOrDefaultAsync(x => x.Id == model.Id);
            if (entity == null)
                return NotFound();

            entity.IdProducto = model.IdCombo;
            entity.PrecioVenta = precio;
            entity.IdUsuarioModifica = idUsuario;
            entity.FechaUsuarioModifica = DateTime.Now;

            await _db.SaveChangesAsync();
            return Ok(new { valor = true });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            var entity = await _db.ProductosPrecios.FirstOrDefaultAsync(x => x.Id == id);
            if (entity == null)
                return Ok(new { valor = false });

            _db.ProductosPrecios.Remove(entity);
            await _db.SaveChangesAsync();
            return Ok(new { valor = true });
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var entity = await _db.ProductosPrecios.AsNoTracking()
                .Include(x => x.IdProductoNavigation)
                .Include(x => x.IdListaPrecioNavigation)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (entity == null)
                return NotFound();

            return Ok(new VMGenericModelConfCombo
            {
                Id = entity.Id,
                IdCombo = entity.IdProducto,
                Nombre = entity.PrecioVenta.ToString("N2", CultureInfo.InvariantCulture),
                NombreCombo = entity.IdProductoNavigation.Nombre + " - " + entity.IdListaPrecioNavigation.Nombre
            });
        }
    }
}
