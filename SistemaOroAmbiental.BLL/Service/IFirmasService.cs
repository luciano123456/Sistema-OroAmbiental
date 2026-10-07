using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface IFirmasService
    {
        Task<ServiceResult> Insertar(Firma model);

        Task<ServiceResult> Actualizar(Firma model);

        Task<ServiceResult> Eliminar(int id, bool cascada = false);

        Task<DependenciasEliminacionInfo> ObtenerDependenciasEliminar(int id);

        Task<Firma?> Obtener(int id);

        Task<IQueryable<Firma>> ObtenerTodos(bool soloActivos = false);

        Task<ServiceResult> CambiarActivo(int id, bool activo);
    }
}
