using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class DiasRepository : IDiasRepository
    {
        private readonly SistemaOroAmbientalContext _db;

        public DiasRepository(SistemaOroAmbientalContext context)
        {
            _db = context;
        }

        public async Task<bool> Actualizar(Dia model)
        {
            _db.Dias.Update(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            var model = await _db.Dias.FindAsync(id);
            if (model == null) return false;
            _db.Dias.Remove(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(Dia model)
        {
            _db.Dias.Add(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<Dia?> Obtener(int id)
            => await _db.Dias.FindAsync(id);

        public async Task<IQueryable<Dia>> ObtenerTodos()
            => await Task.FromResult(_db.Dias.AsNoTracking().AsQueryable());
    }
}
