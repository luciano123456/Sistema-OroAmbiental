using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface IPartidosService
    {
        Task<bool> Actualizar(Partido model);
        Task<bool> Insertar(Partido model);
        Task<ServiceResult> Eliminar(int id, bool cascada = false);

        Task<DependenciasEliminacionInfo> ObtenerDependenciasEliminar(int id);
        Task<Partido?> Obtener(int id);
        Task<IQueryable<Partido>> ObtenerTodos();
        Task<IQueryable<Partido>> ObtenerPorProvincia(int idProvincia);
    }
}
