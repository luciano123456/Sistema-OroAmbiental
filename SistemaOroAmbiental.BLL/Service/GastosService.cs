using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class GastosService : IGastosService
    {
        private readonly IGastosRepository _repo;

        public GastosService(IGastosRepository repo)
        {
            _repo = repo;
        }

        public Task<bool> Insertar(Gasto model, int idUsuario)
        {
            if (model.ImporteTotal <= 0 || string.IsNullOrWhiteSpace(model.Concepto))
                return Task.FromResult(false);

            return _repo.Insertar(model, idUsuario);
        }

        public Task<bool> Actualizar(Gasto model, int idUsuario)
        {
            if (model.Id <= 0 || model.ImporteTotal <= 0 || string.IsNullOrWhiteSpace(model.Concepto))
                return Task.FromResult(false);

            return _repo.Actualizar(model, idUsuario);
        }

        public Task<bool> Eliminar(int id) => _repo.Eliminar(id);

        public Task<Gasto?> Obtener(int id) => _repo.Obtener(id);

        public Task<List<Gasto>> ListarFiltrado(
            DateTime? fechaDesde,
            DateTime? fechaHasta,
            int? idCategoria,
            int? idCuenta,
            int? idSucursal,
            string? concepto,
            decimal? importeMin)
            => _repo.ListarFiltrado(fechaDesde, fechaHasta, idCategoria, idCuenta, idSucursal, concepto, importeMin);

        public Task<int> SincronizarMovimientosCajaPendientes(int idUsuario)
            => _repo.SincronizarMovimientosCajaPendientes(idUsuario);
    }
}
