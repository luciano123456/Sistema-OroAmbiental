using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IUsuariosRolesRepository
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(UsuariosRol model);
        Task<bool> Insertar(UsuariosRol model);
        Task<UsuariosRol?> Obtener(int id);
        Task<IQueryable<UsuariosRol>> ObtenerTodos();
    }
}
