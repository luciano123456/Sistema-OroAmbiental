using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class UsuariosEstadosRepository : IUsuariosEstadosRepository
    {
        private readonly SistemaOroAmbientalContext _db;

        public UsuariosEstadosRepository(SistemaOroAmbientalContext context)
        {
            _db = context;
        }

        public async Task<bool> Actualizar(UsuariosEstado model)
        {
            _db.UsuariosEstados.Update(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            var model = await _db.UsuariosEstados.FindAsync(id);
            if (model == null) return false;
            _db.UsuariosEstados.Remove(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(UsuariosEstado model)
        {
            _db.UsuariosEstados.Add(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<UsuariosEstado?> Obtener(int id)
            => await _db.UsuariosEstados.FindAsync(id);

        public async Task<IQueryable<UsuariosEstado>> ObtenerTodos()
            => await Task.FromResult(_db.UsuariosEstados.AsNoTracking().AsQueryable());
    }
}
