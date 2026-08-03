using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class ProductosPreciosService : IProductosPreciosService
    {
        private readonly IProductosPreciosRepository _repo;

        public ProductosPreciosService(IProductosPreciosRepository repo)
        {
            _repo = repo;
        }

        public async Task<IReadOnlyList<ProductoPrecioListaDto>> ObtenerMatrizPorProducto(int idProducto)
        {
            var listas = await _repo.ObtenerListasPrecios();
            var precios = idProducto > 0
                ? await _repo.ObtenerPorProducto(idProducto)
                : new List<ProductosPrecio>();

            var mapa = precios
                .GroupBy(x => x.IdListaPrecio)
                .ToDictionary(g => g.Key, g => g.First());

            return listas.Select(lista =>
            {
                mapa.TryGetValue(lista.Id, out var precio);
                return new ProductoPrecioListaDto
                {
                    Id = precio?.Id ?? 0,
                    IdListaPrecio = lista.Id,
                    ListaPrecio = lista.Nombre,
                    PrecioVenta = precio?.PrecioVenta ?? 0,
                    PorcRentabilidad = precio?.PorcRentabilidad ?? 0
                };
            }).ToList();
        }

        public async Task<ServiceResult> GuardarPorProducto(int idProducto, IEnumerable<ProductoPrecioListaDto> precios, int idUsuario)
        {
            if (idProducto <= 0)
                return ServiceResult.Error("Debe guardar el producto antes de asignar precios.", "validacion");

            var entidades = (precios ?? Enumerable.Empty<ProductoPrecioListaDto>())
                .Where(p => p.IdListaPrecio > 0)
                .Select(p => new ProductosPrecio
                {
                    IdListaPrecio = p.IdListaPrecio,
                    PrecioVenta = p.PrecioVenta,
                    PorcRentabilidad = p.PorcRentabilidad
                })
                .ToList();

            var ok = await _repo.GuardarPorProducto(idProducto, entidades, idUsuario);

            return ok
                ? ServiceResult.Success("Precios guardados y actualizados en los establecimientos que usan esas listas.")
                : ServiceResult.Error("No se pudieron guardar los precios");
        }
    }
}
