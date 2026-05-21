using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class SucursalesRepository : ISucursalesRepository
    {
        private readonly SistemaOroAmbientalContext _db;

        public SucursalesRepository(SistemaOroAmbientalContext context)
        {
            _db = context;
        }

        public async Task<bool> Actualizar(Sucursal model)
        {
            _db.Sucursales.Update(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            var model = await _db.Sucursales.FindAsync(id);
            if (model == null) return false;
            _db.Sucursales.Remove(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(Sucursal model)
        {
            _db.Sucursales.Add(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<Sucursal?> Obtener(int id)
            => await _db.Sucursales.FindAsync(id);

        public async Task<IQueryable<Sucursal>> ObtenerTodos()
            => await Task.FromResult(_db.Sucursales.AsNoTracking().AsQueryable());
    }
}
