using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface IProductosPreciosService
    {
        Task<IReadOnlyList<ProductoPrecioListaDto>> ObtenerMatrizPorProducto(int idProducto);

        Task<ServiceResult> GuardarPorProducto(int idProducto, IEnumerable<ProductoPrecioListaDto> precios, int idUsuario);
    }
}
