using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface IProveedoresService
    {
        Task<ServiceResult> Insertar(Proveedore model);

        Task<ServiceResult> Actualizar(Proveedore model);

        Task<DependenciasEliminacionInfo> ObtenerDependenciasEliminar(int id);

        Task<ServiceResult> Eliminar(int id, bool cascada = false);

        Task<Proveedore?> Obtener(int id);

        Task<IQueryable<Proveedore>> ObtenerTodos(bool soloActivos = false);

        Task<ServiceResult> CambiarActivo(int id, bool activo);
    }
}
