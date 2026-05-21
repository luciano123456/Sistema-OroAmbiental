using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class CatalogosService : ICatalogosService
    {
        private readonly ICatalogosRepository _repo;

        public CatalogosService(ICatalogosRepository repo)
        {
            _repo = repo;
        }

        public Task<List<Provincia>> ObtenerProvincias()
            => _repo.ObtenerProvincias();

        public Task<List<CondicionesIva>> ObtenerCondicionesIva()
            => _repo.ObtenerCondicionesIva();

        public Task<List<Sucursal>> ObtenerSucursales()
            => _repo.ObtenerSucursales();
    }
}
