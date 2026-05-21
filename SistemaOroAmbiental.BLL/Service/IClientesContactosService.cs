using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface IClientesContactosService
    {
        Task<List<ClientesContacto>> ObtenerPorCliente(int idCliente);

        Task<ClientesContacto?> Obtener(int id);

        Task<ServiceResult> Insertar(ClientesContacto model);

        Task<ServiceResult> Actualizar(ClientesContacto model);

        Task<ServiceResult> Eliminar(int id);
    }
}
