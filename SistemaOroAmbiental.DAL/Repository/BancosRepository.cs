using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class BancosRepository : IBancosRepository
    {
        private readonly SistemaOroAmbientalContext _db;

        public BancosRepository(SistemaOroAmbientalContext context)
        {
            _db = context;
        }

        public async Task<bool> Actualizar(Banco model)
        {
            _db.Bancos.Update(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            var model = await _db.Bancos.FindAsync(id);
            if (model == null) return false;
            _db.Bancos.Remove(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(Banco model)
        {
            _db.Bancos.Add(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<Banco?> Obtener(int id)
            => await _db.Bancos.FindAsync(id);

        public async Task<IQueryable<Banco>> ObtenerTodos()
            => await Task.FromResult(_db.Bancos.AsNoTracking().AsQueryable());
    }
}
