using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class RolRepository : IRolRepository
    {
        private readonly SistemaOroAmbientalContext _db;

        public RolRepository(SistemaOroAmbientalContext context)
        {
            _db = context;
        }

        public async Task<bool> Actualizar(Rol model)
        {
            _db.Roles.Update(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            var model = await _db.Roles.FindAsync(id);
            if (model == null) return false;
            _db.Roles.Remove(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(Rol model)
        {
            _db.Roles.Add(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<Rol?> Obtener(int id)
            => await _db.Roles.FindAsync(id);

        public async Task<IQueryable<Rol>> ObtenerTodos()
            => await Task.FromResult(_db.Roles.AsNoTracking().AsQueryable());
    }
}
