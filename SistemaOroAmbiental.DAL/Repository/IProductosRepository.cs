using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IProductosRepository
    {
        Task<IQueryable<Producto>> ObtenerTodos();
    }
}
