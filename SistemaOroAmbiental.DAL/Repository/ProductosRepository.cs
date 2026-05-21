using Microsoft.EntityFrameworkCore;
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

        public async Task<IQueryable<Producto>> ObtenerTodos()
            => await Task.FromResult(_db.Productos.AsNoTracking().AsQueryable());
    }
}
