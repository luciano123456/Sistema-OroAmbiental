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
            IReadOnlyList<int> meses,
            IReadOnlyList<int>? idsEstablecimiento = null);

        Task<List<ClienteStockDto>> ObtenerStockCliente(int idCliente, IReadOnlyList<int>? idsEstablecimiento = null);

        Task<List<ClienteProductoSugeridoDto>> ObtenerProductosSugeridos(int idCliente, IReadOnlyList<int>? idsEstablecimiento = null);

        Task<bool> GuardarControlMensual(ClientesControlMensual model, bool esNuevo, int idUsuario);
    }
}
