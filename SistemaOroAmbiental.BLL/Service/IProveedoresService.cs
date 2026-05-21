using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface IProveedoresService
    {
        Task<ServiceResult> Insertar(Proveedore model);

        Task<ServiceResult> Actualizar(Proveedore model);

        Task<ServiceResult> Eliminar(int id);

        Task<Proveedore?> Obtener(int id);

        Task<IQueryable<Proveedore>> ObtenerTodos();
    }
}
