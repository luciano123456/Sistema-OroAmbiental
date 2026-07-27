using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IEntidadCascadeRepository
    {
        Task<DependenciasEliminacionInfo> ObtenerDependenciasClienteAsync(int idCliente);
        Task<DependenciasEliminacionInfo> ObtenerDependenciasProveedorAsync(int idProveedor);
        Task EliminarClienteEnCascadaAsync(int idCliente);
        Task EliminarProveedorEnCascadaAsync(int idProveedor);
    }
}
