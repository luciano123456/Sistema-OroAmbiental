using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface IGastosService
    {
        Task<bool> Insertar(Gasto model, int idUsuario);

        Task<bool> Actualizar(Gasto model, int idUsuario);

        Task<ServiceResult> Eliminar(int id, bool cascada = false);

        Task<DependenciasEliminacionInfo> ObtenerDependenciasEliminar(int id);

        Task<Gasto?> Obtener(int id);

        Task<List<Gasto>> ListarFiltrado(
            DateTime? fechaDesde,
            DateTime? fechaHasta,
            int? idCategoria,
            int? idCuenta,
            int? idSucursal,
            string? concepto,
            decimal? importeMin);

        Task<int> SincronizarMovimientosCajaPendientes(int idUsuario);
    }
}
