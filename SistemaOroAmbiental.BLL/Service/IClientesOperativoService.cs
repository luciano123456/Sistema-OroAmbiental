using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface IClientesOperativoService
    {
        Task<ClientesDashboardDto> ObtenerDashboard();

        Task<ClienteControlAnualDto?> ObtenerControlAnual(int idCliente, int anio);

        Task<ClienteControlFiltradoDto?> ObtenerControlMensualFiltrado(
            int idCliente,
            IReadOnlyList<int> anios,
            IReadOnlyList<int> meses);

        Task<List<ClienteStockDto>> ObtenerStockCliente(int idCliente);

        Task<ServiceResult> GuardarControlMensual(ClientesControlMensual model, int idUsuario);
    }
}
