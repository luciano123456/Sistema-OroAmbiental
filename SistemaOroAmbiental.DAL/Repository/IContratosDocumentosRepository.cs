using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IContratosDocumentosRepository
    {
        Task<List<ContratosDocumento>> ListarPorContrato(int idContrato);
        Task<ContratosDocumento?> Obtener(int id);
        Task<ContratosDocumento> Insertar(ContratosDocumento doc);
        Task<bool> Eliminar(int id);
    }
}
