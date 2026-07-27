using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface IClientesEstablecimientosService
    {
        Task<ServiceResult> Insertar(ClientesEstablecimiento model);
        Task<ServiceResult> Actualizar(ClientesEstablecimiento model);
        Task<ServiceResult> Eliminar(int id);
        Task<ClientesEstablecimiento?> Obtener(int id);
        Task<IQueryable<ClientesEstablecimiento>> ObtenerTodos();
    }
}
