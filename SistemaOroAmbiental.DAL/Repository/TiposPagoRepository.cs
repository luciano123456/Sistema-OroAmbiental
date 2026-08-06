using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class TiposPagoRepository : ITiposPagoRepository
    {
        private readonly SistemaOroAmbientalContext _db;

        public TiposPagoRepository(SistemaOroAmbientalContext context)
        {
            _db = context;
        }

        public async Task<bool> Actualizar(TiposPago model)
        {
            _db.TiposPagos.Update(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            var model = await _db.TiposPagos.FindAsync(id);
            if (model == null) return false;
            _db.TiposPagos.Remove(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(TiposPago model)
        {
            _db.TiposPagos.Add(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<TiposPago?> Obtener(int id)
            => await _db.TiposPagos.FindAsync(id);

        public async Task<IQueryable<TiposPago>> ObtenerTodos()
            => await Task.FromResult(_db.TiposPagos.AsNoTracking().AsQueryable());
    }
}
