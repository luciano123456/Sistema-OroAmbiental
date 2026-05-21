using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface IProductosService
    {
        Task<IQueryable<Producto>> ObtenerTodos();
    }
}
