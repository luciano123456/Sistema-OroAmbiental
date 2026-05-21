using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface ICondicionesIvaRepository
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(CondicionesIva model);
        Task<bool> Insertar(CondicionesIva model);
        Task<CondicionesIva?> Obtener(int id);
        Task<IQueryable<CondicionesIva>> ObtenerTodos();
    }
}
