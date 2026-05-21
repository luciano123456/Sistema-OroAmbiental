using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class UnidadesMedidaRepository : IUnidadesMedidaRepository
    {
        private readonly SistemaOroAmbientalContext _db;

        public UnidadesMedidaRepository(SistemaOroAmbientalContext context)
        {
            _db = context;
        }

        public async Task<bool> Actualizar(UnidadesMedida model)
        {
            _db.UnidadesMedida.Update(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            var model = await _db.UnidadesMedida.FindAsync(id);
            if (model == null) return false;
            _db.UnidadesMedida.Remove(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(UnidadesMedida model)
        {
            _db.UnidadesMedida.Add(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<UnidadesMedida?> Obtener(int id)
            => await _db.UnidadesMedida.FindAsync(id);

        public async Task<IQueryable<UnidadesMedida>> ObtenerTodos()
            => await Task.FromResult(_db.UnidadesMedida.AsNoTracking().AsQueryable());
    }
}
