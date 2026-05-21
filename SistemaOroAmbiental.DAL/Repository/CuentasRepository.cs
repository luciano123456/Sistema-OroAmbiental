using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class CuentasRepository : ICuentasRepository
    {
        private readonly SistemaOroAmbientalContext _db;

        public CuentasRepository(SistemaOroAmbientalContext context)
        {
            _db = context;
        }

        public async Task<bool> Actualizar(Cuenta model)
        {
            _db.Cuentas.Update(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            var model = await _db.Cuentas.FindAsync(id);
            if (model == null) return false;
            _db.Cuentas.Remove(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(Cuenta model)
        {
            _db.Cuentas.Add(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<Cuenta?> Obtener(int id)
            => await _db.Cuentas
                .Include(x => x.IdSucursalNavigation)
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id);

        public async Task<IQueryable<Cuenta>> ObtenerTodos()
            => await Task.FromResult(
                _db.Cuentas
                    .Include(x => x.IdSucursalNavigation)
                    .AsNoTracking()
                    .AsQueryable());
    }
}
