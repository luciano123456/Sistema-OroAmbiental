using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface IUsuariosService
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(User model);
        Task<bool> Insertar(User model);

        Task<User> Obtener(int id);
        Task<User> ObtenerUsuario(string usuario);

        Task<IQueryable<User>> ObtenerTodos(bool soloActivos = false);

        Task<bool> CambiarActivo(int id, bool activo);
    }

}
