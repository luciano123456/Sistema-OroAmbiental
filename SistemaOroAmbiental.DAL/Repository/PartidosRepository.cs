using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class PartidosRepository : IPartidosRepository
    {
        private readonly SistemaOroAmbientalContext _db;

        public PartidosRepository(SistemaOroAmbientalContext context)
        {
            _db = context;
        }

        public async Task<bool> Actualizar(Partido model)
        {
            _db.Partidos.Update(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            var model = await _db.Partidos.FindAsync(id);
            if (model == null) return false;
            _db.Partidos.Remove(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(Partido model)
        {
            _db.Partidos.Add(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<Partido?> Obtener(int id)
            => await _db.Partidos.FindAsync(id);

        public async Task<IQueryable<Partido>> ObtenerTodos()
            => await Task.FromResult(_db.Partidos.AsNoTracking().AsQueryable());

        public async Task<IQueryable<Partido>> ObtenerPorProvincia(int idProvincia)
            => await Task.FromResult(
                _db.Partidos.AsNoTracking().Where(x => x.IdProvincia == idProvincia).AsQueryable());
    }
}
