using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class CondicionesIvaRepository : ICondicionesIvaRepository
    {
        private readonly SistemaOroAmbientalContext _db;

        public CondicionesIvaRepository(SistemaOroAmbientalContext context)
        {
            _db = context;
        }

        public async Task<bool> Actualizar(CondicionesIva model)
        {
            _db.CondicionesIvas.Update(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            var model = await _db.CondicionesIvas.FindAsync(id);
            if (model == null) return false;
            _db.CondicionesIvas.Remove(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(CondicionesIva model)
        {
            _db.CondicionesIvas.Add(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<CondicionesIva?> Obtener(int id)
            => await _db.CondicionesIvas.FindAsync(id);

        public async Task<IQueryable<CondicionesIva>> ObtenerTodos()
            => await Task.FromResult(_db.CondicionesIvas.AsNoTracking().AsQueryable());
    }
}
