using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface ICatalogosService
    {
        Task<List<Provincia>> ObtenerProvincias();

        Task<List<CondicionesIva>> ObtenerCondicionesIva();

        Task<List<Sucursal>> ObtenerSucursales();
    }
}
