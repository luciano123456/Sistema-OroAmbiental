using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface IChoferesService
    {
        Task<ServiceResult> Insertar(Chofer model);

        Task<ServiceResult> Actualizar(Chofer model);

        Task<ServiceResult> Eliminar(int id, bool cascada = false);

        Task<DependenciasEliminacionInfo> ObtenerDependenciasEliminar(int id);

        Task<Chofer?> Obtener(int id);

        Task<IQueryable<Chofer>> ObtenerTodos(bool soloActivos = false);

        Task<ServiceResult> CambiarActivo(int id, bool activo);
    }
}
