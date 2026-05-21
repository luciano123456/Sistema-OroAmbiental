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
            _db.ProductosPrecios.Update(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            var model = await _db.ProductosPrecios.FindAsync(id);
            if (model == null) return false;
            _db.ProductosPrecios.Remove(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(ProductosPrecio model)
        {
            _db.ProductosPrecios.Add(model);
            await _db.SaveChangesAsync();
            return true;
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

        public async Task<int> ObtenerPrimeraListaPrecioId()
            => await _db.ListasPrecios
                .AsNoTracking()
                .OrderBy(x => x.Id)
                .Select(x => x.Id)
                .FirstOrDefaultAsync();
    }
}
