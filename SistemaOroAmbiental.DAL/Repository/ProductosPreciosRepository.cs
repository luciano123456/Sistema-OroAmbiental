using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class ProductosPreciosRepository : IProductosPreciosRepository
    {
        private readonly SistemaOroAmbientalContext _db;

        public ProductosPreciosRepository(SistemaOroAmbientalContext context)
        {
            _db = context;
        }

        public async Task<bool> Actualizar(ProductosPrecio model)
        {
            try
            {
                var entity = await _db.ProductosPrecios.FirstOrDefaultAsync(x => x.Id == model.Id);
                if (entity == null)
                    return false;

                entity.PrecioVenta = model.PrecioVenta;
                entity.PorcRentabilidad = model.PorcRentabilidad;
                entity.IdUsuarioModifica = model.IdUsuarioModifica;
                entity.FechaUsuarioModifica = model.FechaUsuarioModifica;

                await _db.SaveChangesAsync();
                return true;
            }
            catch
            {
                return false;
            }
        }

        public async Task<bool> Eliminar(int id)
        {
            try
            {
                var model = await _db.ProductosPrecios.FindAsync(id);
                if (model == null) return false;
                _db.ProductosPrecios.Remove(model);
                await _db.SaveChangesAsync();
                return true;
            }
            catch
            {
                return false;
            }
        }

        public async Task<bool> Insertar(ProductosPrecio model)
        {
            try
            {
                _db.ProductosPrecios.Add(model);
                await _db.SaveChangesAsync();
                return true;
            }
            catch
            {
                return false;
            }
        }

        public async Task<ProductosPrecio?> Obtener(int id)
            => await _db.ProductosPrecios
                .Include(x => x.IdProductoNavigation)
                .Include(x => x.IdListaPrecioNavigation)
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id);

        public async Task<IQueryable<ProductosPrecio>> ObtenerTodos()
            => await Task.FromResult(
                _db.ProductosPrecios
                    .Include(x => x.IdProductoNavigation)
                    .Include(x => x.IdListaPrecioNavigation)
                    .AsNoTracking()
                    .AsQueryable());

        public async Task<List<ProductosPrecio>> ObtenerPorProducto(int idProducto)
            => await _db.ProductosPrecios
                .AsNoTracking()
                .Where(x => x.IdProducto == idProducto)
                .ToListAsync();

        public async Task<List<ListasPrecio>> ObtenerListasPrecios()
            => await _db.ListasPrecios
                .AsNoTracking()
                .OrderBy(x => x.Nombre)
                .ToListAsync();

        public async Task<bool> GuardarPorProducto(int idProducto, IEnumerable<ProductosPrecio> precios, int idUsuario)
        {
            try
            {
                var listaPrecios = (precios ?? Enumerable.Empty<ProductosPrecio>()).ToList();

                var existentes = await _db.ProductosPrecios
                    .Where(x => x.IdProducto == idProducto)
                    .ToListAsync();

                // Si hay filas duplicadas por lista, conservar una sola.
                var mapaExistentes = existentes
                    .GroupBy(x => x.IdListaPrecio)
                    .ToDictionary(g => g.Key, g => g.First());
                foreach (var dup in existentes.Where(x => mapaExistentes[x.IdListaPrecio].Id != x.Id))
                    _db.ProductosPrecios.Remove(dup);

                var ahora = DateTime.Now;
                var preciosActualizados = new List<(int IdListaPrecio, decimal PrecioVenta)>();

                foreach (var item in listaPrecios)
                {
                    if (item.IdListaPrecio <= 0)
                        continue;

                    if (item.PrecioVenta <= 0)
                    {
                        // Solo limpia el precio de catálogo. Nunca elimina productos de establecimientos.
                        if (mapaExistentes.TryGetValue(item.IdListaPrecio, out var borrar))
                        {
                            _db.ProductosPrecios.Remove(borrar);
                            mapaExistentes.Remove(item.IdListaPrecio);
                        }
                        continue;
                    }

                    if (mapaExistentes.TryGetValue(item.IdListaPrecio, out var actual))
                    {
                        var precioCambio = actual.PrecioVenta != item.PrecioVenta;
                        actual.PrecioVenta = item.PrecioVenta;
                        actual.PorcRentabilidad = item.PorcRentabilidad;
                        actual.IdUsuarioModifica = idUsuario;
                        actual.FechaUsuarioModifica = ahora;
                        if (precioCambio)
                            preciosActualizados.Add((item.IdListaPrecio, item.PrecioVenta));
                    }
                    else
                    {
                        _db.ProductosPrecios.Add(new ProductosPrecio
                        {
                            IdProducto = idProducto,
                            IdListaPrecio = item.IdListaPrecio,
                            PrecioVenta = item.PrecioVenta,
                            PorcRentabilidad = item.PorcRentabilidad,
                            IdUsuarioRegistra = idUsuario,
                            FechaUsuarioRegistra = ahora
                        });
                        preciosActualizados.Add((item.IdListaPrecio, item.PrecioVenta));
                    }
                }

                // Propagar precio de lista a todos los establecimientos que usen ese producto + lista.
                // No crea ni elimina asignaciones: solo actualiza PrecioVenta.
                if (preciosActualizados.Count > 0)
                {
                    var idsListas = preciosActualizados.Select(x => x.IdListaPrecio).Distinct().ToList();
                    var mapaNuevos = preciosActualizados
                        .GroupBy(x => x.IdListaPrecio)
                        .ToDictionary(g => g.Key, g => g.Last().PrecioVenta);

                    var asignaciones = await _db.ClientesEstablecimientosProductos
                        .Where(x =>
                            x.IdProducto == idProducto
                            && x.IdListaPrecio != null
                            && idsListas.Contains(x.IdListaPrecio.Value))
                        .ToListAsync();

                    foreach (var cep in asignaciones)
                    {
                        if (cep.IdListaPrecio is not int idLista)
                            continue;
                        if (!mapaNuevos.TryGetValue(idLista, out var nuevoPrecio))
                            continue;
                        if (cep.PrecioVenta == nuevoPrecio)
                            continue;

                        cep.PrecioVenta = nuevoPrecio;
                        cep.IdUsuarioModifica = idUsuario;
                        cep.FechaUsuarioModifica = ahora;
                    }
                }

                await _db.SaveChangesAsync();
                return true;
            }
            catch
            {
                return false;
            }
        }
    }
}
