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
                var existentes = await _db.ProductosPrecios
                    .Where(x => x.IdProducto == idProducto)
                    .ToListAsync();

                var mapaExistentes = existentes.ToDictionary(x => x.IdListaPrecio);
                var ahora = DateTime.Now;

                foreach (var item in precios)
                {
                    if (item.PrecioVenta <= 0)
                    {
                        if (mapaExistentes.TryGetValue(item.IdListaPrecio, out var borrar))
                        {
                            _db.ProductosPrecios.Remove(borrar);
                            mapaExistentes.Remove(item.IdListaPrecio);
                        }
                        continue;
                    }

                    if (mapaExistentes.TryGetValue(item.IdListaPrecio, out var actual))
                    {
                        actual.PrecioVenta = item.PrecioVenta;
                        actual.PorcRentabilidad = item.PorcRentabilidad;
                        actual.IdUsuarioModifica = idUsuario;
                        actual.FechaUsuarioModifica = ahora;
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
