using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IListasPreciosRepository
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(ListasPrecio model);
        Task<bool> Insertar(ListasPrecio model);
        Task<ListasPrecio?> Obtener(int id);
        Task<IQueryable<ListasPrecio>> ObtenerTodos();
    }
}
