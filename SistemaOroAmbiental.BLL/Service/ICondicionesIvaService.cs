using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface ICondicionesIvaService
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(CondicionesIva model);
        Task<bool> Insertar(CondicionesIva model);
        Task<CondicionesIva?> Obtener(int id);
        Task<IQueryable<CondicionesIva>> ObtenerTodos();
    }
}
