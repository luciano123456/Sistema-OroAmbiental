using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface IGastosCategoriasService
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(GastosCategoria model);
        Task<bool> Insertar(GastosCategoria model);
        Task<GastosCategoria?> Obtener(int id);
        Task<IQueryable<GastosCategoria>> ObtenerTodos();
    }
}
