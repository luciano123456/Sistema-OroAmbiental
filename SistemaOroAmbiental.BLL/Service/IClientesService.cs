using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface IClientesService
    {
        Task<ServiceResult> Insertar(Cliente model);

        Task<ServiceResult> Actualizar(Cliente model);

        Task<ServiceResult> Eliminar(int id);

        Task<Cliente?> Obtener(int id);

        Task<IQueryable<Cliente>> ObtenerTodos();
    }
}
