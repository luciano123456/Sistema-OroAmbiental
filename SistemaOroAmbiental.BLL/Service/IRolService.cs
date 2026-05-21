using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface IRolService
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(Rol model);
        Task<bool> Insertar(Rol model);
        Task<Rol?> Obtener(int id);
        Task<IQueryable<Rol>> ObtenerTodos();
    }
}
