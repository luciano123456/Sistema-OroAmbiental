using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class EstadosUsuariosRepository : IEstadosUsuariosRepository
    {
        private readonly SistemaOroAmbientalContext _db;

        public EstadosUsuariosRepository(SistemaOroAmbientalContext context)
        {
            _db = context;
        }

        public async Task<bool> Actualizar(EstadosUsuario model)
        {
            _db.EstadosUsuarios.Update(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            var model = await _db.EstadosUsuarios.FindAsync(id);
            if (model == null) return false;
            _db.EstadosUsuarios.Remove(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(EstadosUsuario model)
        {
            _db.EstadosUsuarios.Add(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<EstadosUsuario?> Obtener(int id)
            => await _db.EstadosUsuarios.FindAsync(id);

        public async Task<IQueryable<EstadosUsuario>> ObtenerTodos()
            => await Task.FromResult(_db.EstadosUsuarios.AsNoTracking().AsQueryable());
    }
}
