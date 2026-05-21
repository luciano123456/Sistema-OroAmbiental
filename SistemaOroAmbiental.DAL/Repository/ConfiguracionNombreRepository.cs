using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class ConfiguracionNombreRepository<T> : IConfiguracionNombreRepository<T>
        where T : class
    {
        private readonly SistemaOroAmbientalContext _db;

        public ConfiguracionNombreRepository(SistemaOroAmbientalContext context)
        {
            _db = context;
        }

        public async Task<bool> Insertar(T model)
        {
            _db.Set<T>().Add(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Actualizar(T model)
        {
            _db.Set<T>().Update(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            var entity = await _db.Set<T>().FindAsync(id);
            if (entity == null)
                return false;

            _db.Set<T>().Remove(entity);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<T?> Obtener(int id)
        {
            return await _db.Set<T>().FindAsync(id);
        }

        public async Task<IQueryable<T>> ObtenerTodos()
        {
            return await Task.FromResult(_db.Set<T>().AsNoTracking().AsQueryable());
        }
    }
}
