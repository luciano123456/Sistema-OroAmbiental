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

        public async Task<bool> Insertar(Producto model)
        {
            try
            {
                _db.Productos.Add(model);
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

                entity.Nombre = model.Nombre;
                entity.IdCategoria = model.IdCategoria;
                entity.IdMedida = model.IdMedida;
                entity.CostoUnitario = model.CostoUnitario;
                entity.StockMinimo = model.StockMinimo;
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
            try
            {
                var entity = await _db.Productos.FirstOrDefaultAsync(x => x.Id == id);
                if (entity == null)
                    return false;

                _db.Productos.Remove(entity);
                await _db.SaveChangesAsync();
                return true;
            }
            catch
            {
                return false;
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
    }
}
