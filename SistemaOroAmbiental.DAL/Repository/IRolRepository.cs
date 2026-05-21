using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IRolRepository
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(Rol model);
        Task<bool> Insertar(Rol model);
        Task<Rol?> Obtener(int id);
        Task<IQueryable<Rol>> ObtenerTodos();
    }
}
