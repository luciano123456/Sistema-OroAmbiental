using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface IClientesEstablecimientosProductosService
    {
        Task<List<ClientesEstablecimientosProducto>> ObtenerPorEstablecimiento(int idEstablecimiento);
        Task<ServiceResult> Insertar(ClientesEstablecimientosProducto model);
        Task<ServiceResult> Actualizar(ClientesEstablecimientosProducto model);
        Task<ServiceResult> Eliminar(int id);
    }
}
