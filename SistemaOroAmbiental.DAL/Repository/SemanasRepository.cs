using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class SemanasRepository : ISemanasRepository
    {
        private readonly SistemaOroAmbientalContext _db;

        public SemanasRepository(SistemaOroAmbientalContext context)
        {
            _db = context;
        }

        public async Task<bool> Actualizar(Semana model)
        {
            _db.Semanas.Update(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            var model = await _db.Semanas.FindAsync(id);
            if (model == null) return false;
            _db.Semanas.Remove(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(Semana model)
        {
            _db.Semanas.Add(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<Semana?> Obtener(int id)
            => await _db.Semanas.FindAsync(id);

        public async Task<IQueryable<Semana>> ObtenerTodos()
            => await Task.FromResult(_db.Semanas.AsNoTracking().AsQueryable());
    }
}
