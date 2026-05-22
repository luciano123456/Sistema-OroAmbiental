using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface IContratosRenovacionesService
    {
        Task<List<ContratosRenovacion>> ObtenerPorContrato(int idContrato);

        Task<ServiceResult> Insertar(ContratosRenovacion model);

        Task<ServiceResult> Actualizar(ContratosRenovacion model);

        Task<ServiceResult> Eliminar(int id);
    }
}
