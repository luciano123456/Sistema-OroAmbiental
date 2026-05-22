using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface IContratosService
    {
        Task<List<Contrato>> ListarFiltrado(int? idCliente, bool? soloVigentes, string? texto);

        Task<IQueryable<Contrato>> ObtenerTodos();

        Task<Contrato?> Obtener(int id);

        Task<ServiceResult> Insertar(Contrato model);

        Task<ServiceResult> Actualizar(Contrato model);

        Task<ServiceResult> Eliminar(int id);
    }
}
