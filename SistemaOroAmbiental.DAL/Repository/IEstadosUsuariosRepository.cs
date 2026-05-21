using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IEstadosUsuariosRepository
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(EstadosUsuario model);
        Task<bool> Insertar(EstadosUsuario model);
        Task<EstadosUsuario?> Obtener(int id);
        Task<IQueryable<EstadosUsuario>> ObtenerTodos();
    }
}
