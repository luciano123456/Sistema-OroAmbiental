using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface ICatalogosRepository
    {
        Task<List<Provincia>> ObtenerProvincias();

        Task<List<CondicionesIva>> ObtenerCondicionesIva();

        Task<List<Sucursal>> ObtenerSucursales();
    }
}
