using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface IGastosService
    {
        Task<bool> Insertar(Gasto model, int idUsuario);

        Task<bool> Actualizar(Gasto model, int idUsuario);

        Task<bool> Eliminar(int id);

        Task<Gasto?> Obtener(int id);

        Task<List<Gasto>> ListarFiltrado(
            DateTime? fechaDesde,
            DateTime? fechaHasta,
            int? idCategoria,
            int? idCuenta,
            int? idSucursal,
            string? concepto,
            decimal? importeMin);
    }
}
