using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class ClientesProfesionesRepository : IClientesProfesionesRepository
    {
        private readonly SistemaOroAmbientalContext _db;

        public ClientesProfesionesRepository(SistemaOroAmbientalContext context)
        {
            _db = context;
        }

        public async Task<bool> Actualizar(ClientesProfesion model)
        {
            _db.ClientesProfesiones.Update(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            var model = await _db.ClientesProfesiones.FindAsync(id);
            if (model == null) return false;
            _db.ClientesProfesiones.Remove(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(ClientesProfesion model)
        {
            _db.ClientesProfesiones.Add(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<ClientesProfesion?> Obtener(int id)
            => await _db.ClientesProfesiones.FindAsync(id);

        public async Task<IQueryable<ClientesProfesion>> ObtenerTodos()
            => await Task.FromResult(_db.ClientesProfesiones.AsNoTracking().AsQueryable());
    }
}
