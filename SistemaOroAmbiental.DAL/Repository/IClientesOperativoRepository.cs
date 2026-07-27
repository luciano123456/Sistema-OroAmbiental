using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IClientesOperativoRepository
    {
        Task<ClientesDashboardDto> ObtenerDashboard();

        Task<ClienteControlAnualDto?> ObtenerControlAnual(int idCliente, int anio);

        Task<ClienteControlFiltradoDto?> ObtenerControlMensualFiltrado(
            int idCliente,
            IReadOnlyList<int> anios,
            IReadOnlyList<int> meses);

        Task<List<ClienteStockDto>> ObtenerStockCliente(int idCliente);

        Task<bool> GuardarControlMensual(ClientesControlMensual model, bool esNuevo, int idUsuario);
    }
}
