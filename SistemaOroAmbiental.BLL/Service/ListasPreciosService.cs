using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class ListasPreciosService : IListasPreciosService
    {
        private readonly IListasPreciosRepository _repo;

        public ListasPreciosService(IListasPreciosRepository repo)
        {
            _repo = repo;
        }

        public Task<bool> Actualizar(ListasPrecio model) => _repo.Actualizar(model);
        public Task<bool> Eliminar(int id) => _repo.Eliminar(id);
        public Task<bool> Insertar(ListasPrecio model) => _repo.Insertar(model);
        public Task<ListasPrecio?> Obtener(int id) => _repo.Obtener(id);
        public Task<IQueryable<ListasPrecio>> ObtenerTodos() => _repo.ObtenerTodos();
    }
}
