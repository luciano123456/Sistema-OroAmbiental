using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface IEstadosUsuariosService
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(UsuariosEstado model);
        Task<bool> Insertar(UsuariosEstado model);

        Task<UsuariosEstado> Obtener(int id);

        Task<IQueryable<UsuariosEstado>> ObtenerTodos();
    }

}
