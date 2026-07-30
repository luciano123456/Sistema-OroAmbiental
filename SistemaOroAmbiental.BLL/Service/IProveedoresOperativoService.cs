using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface IProveedoresOperativoService
    {
        Task<ProveedorControlFiltradoDto?> ObtenerControlMensualFiltrado(
            int idProveedor,
            IReadOnlyList<int> anios,
            IReadOnlyList<int> meses);

        Task<ServiceResult> GuardarControlMensual(ProveedoresControlMensual model, int idUsuario);
    }
}
