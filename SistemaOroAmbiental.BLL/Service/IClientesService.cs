using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface IClientesService
    {
        Task<ServiceResult> Insertar(Cliente model);

        Task<ServiceResult> Actualizar(Cliente model);

        Task<DependenciasEliminacionInfo> ObtenerDependenciasEliminar(int id);

        Task<ServiceResult> Eliminar(int id, bool cascada = false);

        Task<Cliente?> Obtener(int id);

        Task<IQueryable<Cliente>> ObtenerTodos(bool soloActivos = false);

        Task<ServiceResult> CambiarActivo(int id, bool activo);
    }
}
