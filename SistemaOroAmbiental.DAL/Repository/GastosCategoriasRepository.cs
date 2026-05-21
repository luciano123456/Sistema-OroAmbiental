using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class GastosCategoriasRepository : IGastosCategoriasRepository
    {
        private readonly SistemaOroAmbientalContext _db;

        public GastosCategoriasRepository(SistemaOroAmbientalContext context)
        {
            _db = context;
        }

        public async Task<bool> Actualizar(GastosCategoria model)
        {
            _db.GastosCategorias.Update(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            var model = await _db.GastosCategorias.FindAsync(id);
            if (model == null) return false;
            _db.GastosCategorias.Remove(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(GastosCategoria model)
        {
            _db.GastosCategorias.Add(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<GastosCategoria?> Obtener(int id)
            => await _db.GastosCategorias.FindAsync(id);

        public async Task<IQueryable<GastosCategoria>> ObtenerTodos()
            => await Task.FromResult(_db.GastosCategorias.AsNoTracking().AsQueryable());
    }
}
