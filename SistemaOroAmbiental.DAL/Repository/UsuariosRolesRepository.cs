using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class UsuariosRolesRepository : IUsuariosRolesRepository
    {
        private readonly SistemaOroAmbientalContext _db;

        public UsuariosRolesRepository(SistemaOroAmbientalContext context)
        {
            _db = context;
        }

        public async Task<bool> Actualizar(UsuariosRol model)
        {
            _db.UsuariosRoles.Update(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            var model = await _db.UsuariosRoles.FindAsync(id);
            if (model == null) return false;
            _db.UsuariosRoles.Remove(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(UsuariosRol model)
        {
            _db.UsuariosRoles.Add(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<UsuariosRol?> Obtener(int id)
            => await _db.UsuariosRoles.FindAsync(id);

        public async Task<IQueryable<UsuariosRol>> ObtenerTodos()
            => await Task.FromResult(_db.UsuariosRoles.AsNoTracking().AsQueryable());
    }
}
