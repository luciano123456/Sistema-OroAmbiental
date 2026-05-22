using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface IClientesEstablecimientosContactosService
    {
        Task<List<ClientesEstablecimientosContacto>> ObtenerPorEstablecimiento(int idEstablecimiento);
        Task<ServiceResult> Insertar(ClientesEstablecimientosContacto model);
        Task<ServiceResult> Actualizar(ClientesEstablecimientosContacto model);
        Task<ServiceResult> Eliminar(int id);
    }
}
