using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class ProvinciasRepository : IProvinciasRepository
    {
        private readonly SistemaOroAmbientalContext _db;

        public ProvinciasRepository(SistemaOroAmbientalContext context)
        {
            _db = context;
        }

        public async Task<bool> Actualizar(Provincia model)
        {
            _db.Provincias.Update(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            var model = await _db.Provincias.FindAsync(id);
            if (model == null) return false;
            _db.Provincias.Remove(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(Provincia model)
        {
            _db.Provincias.Add(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<Provincia?> Obtener(int id)
            => await _db.Provincias.FindAsync(id);

        public async Task<IQueryable<Provincia>> ObtenerTodos()
            => await Task.FromResult(_db.Provincias.AsNoTracking().AsQueryable());
    }
}
