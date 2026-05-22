using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface IUsuariosEstadosService
    {
        Task<bool> Actualizar(UsuariosEstado model);
        Task<bool> Eliminar(int id);
        Task<bool> Insertar(UsuariosEstado model);
        Task<UsuariosEstado?> Obtener(int id);
        Task<IQueryable<UsuariosEstado>> ObtenerTodos();
    }
}
