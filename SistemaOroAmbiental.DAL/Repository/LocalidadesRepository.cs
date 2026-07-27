using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class LocalidadesRepository : ILocalidadesRepository
    {
        private readonly SistemaOroAmbientalContext _db;

        public LocalidadesRepository(SistemaOroAmbientalContext context)
        {
            _db = context;
        }

        public async Task<bool> Actualizar(Localidad model)
        {
            _db.Localidades.Update(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            var model = await _db.Localidades.FindAsync(id);
            if (model == null) return false;
            _db.Localidades.Remove(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(Localidad model)
        {
            _db.Localidades.Add(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<Localidad?> Obtener(int id)
            => await _db.Localidades.FindAsync(id);

        public async Task<IQueryable<Localidad>> ObtenerTodos()
            => await Task.FromResult(_db.Localidades.AsNoTracking().AsQueryable());

        public async Task<IQueryable<Localidad>> ObtenerPorProvincia(int idProvincia)
            => await Task.FromResult(
                _db.Localidades.AsNoTracking().Where(x => x.IdProvincia == idProvincia).AsQueryable());

        public async Task<IQueryable<Localidad>> ObtenerPorPartido(int idPartido)
            => await Task.FromResult(
                _db.Localidades.AsNoTracking().Where(x => x.IdPartido == idPartido).AsQueryable());
    }
}
