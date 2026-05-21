using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class ListasPreciosRepository : IListasPreciosRepository
    {
        private readonly SistemaOroAmbientalContext _db;

        public ListasPreciosRepository(SistemaOroAmbientalContext context)
        {
            _db = context;
        }

        public async Task<bool> Actualizar(ListasPrecio model)
        {
            _db.ListasPrecios.Update(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            var model = await _db.ListasPrecios.FindAsync(id);
            if (model == null) return false;
            _db.ListasPrecios.Remove(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(ListasPrecio model)
        {
            _db.ListasPrecios.Add(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<ListasPrecio?> Obtener(int id)
            => await _db.ListasPrecios.FindAsync(id);

        public async Task<IQueryable<ListasPrecio>> ObtenerTodos()
            => await Task.FromResult(_db.ListasPrecios.AsNoTracking().AsQueryable());
    }
}
