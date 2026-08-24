using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface ICatalogoCascadeRepository
    {
        Task<DependenciasEliminacionInfo> ObtenerDependenciasAsync<T>(int id) where T : class;
        Task EliminarEnCascadaAsync<T>(int id) where T : class;
    }
}
