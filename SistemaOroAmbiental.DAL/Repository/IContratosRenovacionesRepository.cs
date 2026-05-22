using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IContratosRenovacionesRepository
    {
        Task<List<ContratosRenovacion>> ObtenerPorContrato(int idContrato);

        Task<ContratosRenovacion?> Obtener(int id);

        Task<(bool Ok, string? Error)> Insertar(ContratosRenovacion model);

        Task<(bool Ok, string? Error)> Actualizar(ContratosRenovacion model);

        Task<bool> Eliminar(int id);
    }
}
