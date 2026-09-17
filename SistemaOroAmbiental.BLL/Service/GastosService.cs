using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class GastosService : IGastosService
    {
        private readonly IGastosRepository _repo;
        private readonly IEntidadCascadeRepository _cascadeRepo;

        public GastosService(IGastosRepository repo, IEntidadCascadeRepository cascadeRepo)
        {
            _repo = repo;
            _cascadeRepo = cascadeRepo;
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

        public Task<DependenciasEliminacionInfo> ObtenerDependenciasEliminar(int id)
            => _cascadeRepo.ObtenerDependenciasGastoAsync(id);

        public Task<ServiceResult> Eliminar(int id, bool cascada = false)
            => DeleteOperationHelper.ExecuteCascadeAsync(
                id,
                cascada,
                "el gasto",
                () => _cascadeRepo.ObtenerDependenciasGastoAsync(id),
                () => _cascadeRepo.EliminarGastoEnCascadaAsync(id),
                () => DeleteOperationHelper.ExecuteAsync(
                    () => _repo.Eliminar(id),
                    "el gasto",
                    "Gasto eliminado. Se revirtió el movimiento en caja.",
                    id),
                "Gasto eliminado. Se revirtió el movimiento en caja.",
                "Error inesperado al eliminar el gasto en cascada.");

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
