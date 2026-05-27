using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.Common;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class ProductosRepository : IProductosRepository
    {
        private readonly SistemaOroAmbientalContext _db;

        public ProductosRepository(SistemaOroAmbientalContext context)
        {
            _db = context;
        }

        public async Task<bool> Insertar(Producto model)
        {
            try
            {
                _db.Productos.Add(model);
                await _db.SaveChangesAsync();

                ProductosCostoHistorialHelper.Registrar(
                    _db,
                    model.Id,
                    0,
                    model.CostoUnitario,
                    ProductosCostoHistorialHelper.OrigenAlta,
                    model.FechaUsuarioRegistra,
                    model.IdUsuarioRegistra);

                await _db.SaveChangesAsync();
                return true;
            }
            catch
            {
                return false;
            }
        }

        public async Task<bool> Actualizar(Producto model)
        {
            try
            {
                var entity = await _db.Productos.FirstOrDefaultAsync(x => x.Id == model.Id);
                if (entity == null)
                    return false;

                var costoAnterior = entity.CostoUnitario;

                entity.Nombre = model.Nombre;
                entity.IdCategoria = model.IdCategoria;
                entity.IdMedida = model.IdMedida;
                entity.CostoUnitario = model.CostoUnitario;
                entity.StockMinimo = model.StockMinimo;
                entity.IdUsuarioModifica = model.IdUsuarioModifica;
                entity.FechaUsuarioModifica = model.FechaUsuarioModifica;

                if (costoAnterior != model.CostoUnitario && model.FechaUsuarioModifica.HasValue)
                {
                    ProductosCostoHistorialHelper.Registrar(
                        _db,
                        entity.Id,
                        costoAnterior,
                        model.CostoUnitario,
                        ProductosCostoHistorialHelper.OrigenManual,
                        model.FechaUsuarioModifica.Value,
                        model.IdUsuarioModifica);
                }

                await _db.SaveChangesAsync();
                return true;
            }
            catch
            {
                return false;
            }
        }

        public async Task<Producto?> BuscarDuplicado(int? idExcluir, string? nombre)
        {
            if (string.IsNullOrWhiteSpace(nombre))
                return null;

            var query = _db.Productos.AsQueryable();

            if (idExcluir.HasValue)
                query = query.Where(x => x.Id != idExcluir.Value);

            return await query.FirstOrDefaultAsync(x => x.Nombre == nombre);
        }

        public async Task<bool> Eliminar(int id)
        {
            await using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                var entity = await _db.Productos.FirstOrDefaultAsync(x => x.Id == id);
                if (entity == null)
                {
                    await trx.RollbackAsync();
                    return false;
                }

                var bloqueadoPorUso =
                    await _db.ComprasProductos.AnyAsync(x => x.IdProducto == id)
                    || await _db.ClientesEntregasProductos.AnyAsync(x => x.IdProducto == id)
                    || await _db.ClientesEstablecimientosProductos.AnyAsync(x => x.IdProducto == id);

                if (bloqueadoPorUso)
                    throw new InvalidOperationException("PRODUCTO_EN_USO");

                var idsInventario = await _db.Inventarios
                    .Where(x => x.IdProducto == id)
                    .Select(x => x.Id)
                    .ToListAsync();

                if (idsInventario.Count > 0)
                {
                    var movimientos = _db.InventarioMovimientos.Where(x => idsInventario.Contains(x.IdInventario));
                    _db.InventarioMovimientos.RemoveRange(movimientos);

                    var inventarios = _db.Inventarios.Where(x => x.IdProducto == id);
                    _db.Inventarios.RemoveRange(inventarios);
                }

                var precios = _db.ProductosPrecios.Where(x => x.IdProducto == id);
                _db.ProductosPrecios.RemoveRange(precios);

                var historial = _db.ProductosCostoHistorials.Where(x => x.IdProducto == id);
                _db.ProductosCostoHistorials.RemoveRange(historial);

                _db.Productos.Remove(entity);
                await _db.SaveChangesAsync();
                await trx.CommitAsync();
                return true;
            }
            catch
            {
                await trx.RollbackAsync();
                throw;
            }
        }

        public async Task<Producto?> Obtener(int id)
        {
            return await _db.Productos
                .AsNoTracking()
                .Include(x => x.IdCategoriaNavigation)
                .Include(x => x.IdMedidaNavigation)
                .Include(x => x.IdUsuarioRegistraNavigation)
                .Include(x => x.IdUsuarioModificaNavigation)
                .FirstOrDefaultAsync(x => x.Id == id);
        }

        public async Task<IQueryable<Producto>> ObtenerTodos()
        {
            var query = _db.Productos
                .AsNoTracking()
                .Include(x => x.IdCategoriaNavigation)
                .Include(x => x.IdMedidaNavigation)
                .Include(x => x.IdUsuarioRegistraNavigation)
                .Include(x => x.IdUsuarioModificaNavigation);

            return await Task.FromResult(query);
        }

        public async Task<Dictionary<int, decimal>> ObtenerStockTotalesPorProducto()
        {
            return await _db.Inventarios
                .AsNoTracking()
                .GroupBy(x => x.IdProducto)
                .Select(g => new { g.Key, Total = g.Sum(x => x.Stock) })
                .ToDictionaryAsync(x => x.Key, x => x.Total);
        }

        public async Task<List<ProductoHistorialCostoFila>> ObtenerHistorialCosto(int idProducto)
        {
            var registros = await _db.ProductosCostoHistorials
                .AsNoTracking()
                .Include(x => x.IdUsuarioNavigation)
                .Include(x => x.IdCompraNavigation)
                    .ThenInclude(c => c!.IdProveedorNavigation)
                .Where(x => x.IdProducto == idProducto)
                .OrderByDescending(x => x.Fecha)
                .ThenByDescending(x => x.Id)
                .ToListAsync();

            var filas = new List<ProductoHistorialCostoFila>();

            foreach (var h in registros)
            {
                var costoAnterior = h.CostoAnterior;

                if (costoAnterior <= 0
                    && (h.Origen == ProductosCostoHistorialHelper.OrigenCompra
                        || h.Origen == ProductosCostoHistorialHelper.OrigenReversionCompra)
                    && h.IdCompra.HasValue)
                {
                    var anteriorCompra = await _db.ComprasProductos
                        .AsNoTracking()
                        .Where(x => x.IdCompra == h.IdCompra && x.IdProducto == idProducto)
                        .OrderByDescending(x => x.Id)
                        .Select(x => x.CostoUnitarioAnterior)
                        .FirstOrDefaultAsync();

                    if (anteriorCompra > 0)
                        costoAnterior = anteriorCompra;
                }

                var variacion = h.CostoNuevo - costoAnterior;
                decimal? porcentaje = null;
                if (costoAnterior > 0)
                    porcentaje = Math.Round(variacion / costoAnterior * 100m, 2);

                string? proveedor = null;
                if (h.Origen == ProductosCostoHistorialHelper.OrigenCompra
                    || h.Origen == ProductosCostoHistorialHelper.OrigenReversionCompra)
                {
                    proveedor = h.IdCompraNavigation?.IdProveedorNavigation?.Nombre?.Trim();
                }

                filas.Add(new ProductoHistorialCostoFila
                {
                    Id = h.Id,
                    Fecha = h.Fecha,
                    CostoAnterior = costoAnterior,
                    CostoNuevo = h.CostoNuevo,
                    Variacion = variacion,
                    PorcentajeVariacion = porcentaje,
                    Origen = h.Origen,
                    IdCompra = h.IdCompra,
                    Usuario = h.IdUsuarioNavigation?.Usuario,
                    Proveedor = proveedor
                });
            }

            return filas;
        }
    }
}
