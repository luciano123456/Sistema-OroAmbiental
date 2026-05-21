using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class EntregasEstadosRepository : IEntregasEstadosRepository
    {
        private readonly SistemaOroAmbientalContext _db;

        public EntregasEstadosRepository(SistemaOroAmbientalContext context)
        {
            _db = context;
        }

        public async Task<bool> Actualizar(EntregasEstado model)
        {
            _db.EntregasEstados.Update(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            var model = await _db.EntregasEstados.FindAsync(id);
            if (model == null) return false;
            _db.EntregasEstados.Remove(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(EntregasEstado model)
        {
            _db.EntregasEstados.Add(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<EntregasEstado?> Obtener(int id)
            => await _db.EntregasEstados.FindAsync(id);

        public async Task<IQueryable<EntregasEstado>> ObtenerTodos()
            => await Task.FromResult(_db.EntregasEstados.AsNoTracking().AsQueryable());
    }
}
