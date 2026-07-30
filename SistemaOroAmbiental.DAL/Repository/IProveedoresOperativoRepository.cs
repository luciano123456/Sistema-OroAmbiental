using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IProveedoresOperativoRepository
    {
        Task<ProveedorControlFiltradoDto?> ObtenerControlMensualFiltrado(
            int idProveedor,
            IReadOnlyList<int> anios,
            IReadOnlyList<int> meses);

        Task<bool> GuardarControlMensual(ProveedoresControlMensual model, bool esNuevo, int idUsuario);
    }
}
