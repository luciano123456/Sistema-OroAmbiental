using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class ProductosCategoriasRepository : IProductosCategoriasRepository
    {
        private readonly SistemaOroAmbientalContext _db;

        public ProductosCategoriasRepository(SistemaOroAmbientalContext context)
        {
            _db = context;
        }

        public async Task<bool> Actualizar(ProductosCategoria model)
        {
            _db.ProductosCategorias.Update(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            var model = await _db.ProductosCategorias.FindAsync(id);
            if (model == null) return false;
            _db.ProductosCategorias.Remove(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(ProductosCategoria model)
        {
            _db.ProductosCategorias.Add(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<ProductosCategoria?> Obtener(int id)
            => await _db.ProductosCategorias.FindAsync(id);

        public async Task<IQueryable<ProductosCategoria>> ObtenerTodos()
            => await Task.FromResult(_db.ProductosCategorias.AsNoTracking().AsQueryable());
    }
}
