using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class ProductosRecuperadosRepository : IProductosRecuperadosRepository
    {
        private readonly SistemaOroAmbientalContext _db;
        private readonly IInventarioRecuperadoRepository _invRecRepo;

        public ProductosRecuperadosRepository(
            SistemaOroAmbientalContext context,
            IInventarioRecuperadoRepository invRecRepo)
        {
            _db = context;
            _invRecRepo = invRecRepo;
        }

        private IQueryable<InventarioRecuperadoMovimiento> QueryRecuperados(ProductosRecuperadosFiltroDto filtro)
        {
            var q = _db.InventarioRecuperadoMovimientos
                .AsNoTracking()
                .Include(x => x.IdInventarioRecuperadoNavigation)
                    .ThenInclude(i => i.IdProductoNavigation)
                        .ThenInclude(p => p.IdCategoriaNavigation)
                .Include(x => x.IdInventarioRecuperadoNavigation)
                    .ThenInclude(i => i.IdProductoNavigation)
                        .ThenInclude(p => p.IdMedidaNavigation)
                .Include(x => x.IdInventarioRecuperadoNavigation)
                    .ThenInclude(i => i.IdSucursalNavigation)
                .Where(x => x.Entrada > 0);

            if (filtro.IdSucursal.HasValue && filtro.IdSucursal > 0)
                q = q.Where(x => x.IdInventarioRecuperadoNavigation.IdSucursal == filtro.IdSucursal);

            if (filtro.IdProducto.HasValue && filtro.IdProducto > 0)
                q = q.Where(x => x.IdInventarioRecuperadoNavigation.IdProducto == filtro.IdProducto);

            if (filtro.FechaDesde.HasValue)
                q = q.Where(x => x.Fecha >= filtro.FechaDesde.Value.Date);

            if (filtro.FechaHasta.HasValue)
            {
                var hasta = filtro.FechaHasta.Value.Date.AddDays(1).AddTicks(-1);
                q = q.Where(x => x.Fecha <= hasta);
            }

            if (!string.IsNullOrWhiteSpace(filtro.Texto))
            {
                var t = filtro.Texto.Trim();
                q = q.Where(x =>
                    x.Concepto.Contains(t) ||
                    x.IdInventarioRecuperadoNavigation.IdProductoNavigation.Nombre.Contains(t));
            }

            return q;
        }

        public async Task<List<ProductoRecuperadoHistorialDto>> ListarHistorial(ProductosRecuperadosFiltroDto filtro)
        {
            filtro ??= new ProductosRecuperadosFiltroDto();
            var movs = await QueryRecuperados(filtro)
                .OrderByDescending(x => x.Fecha)
                .ThenByDescending(x => x.Id)
                .Take(2000)
                .ToListAsync();

            var idsEntrega = movs
                .Where(m =>
                    m.TipoMovimiento == InventarioRecuperadoRepository.TIPO_ENTREGA &&
                    m.IdMovimiento > 0)
                .Select(m => m.IdMovimiento)
                .Distinct()
                .ToList();

            Dictionary<int, (int IdCliente, string Cliente)> entregas = idsEntrega.Count == 0
                ? new Dictionary<int, (int IdCliente, string Cliente)>()
                : await _db.ClientesEntregas
                    .AsNoTracking()
                    .Include(e => e.IdClienteNavigation)
                    .Where(e => idsEntrega.Contains(e.Id))
                    .ToDictionaryAsync(
                        e => e.Id,
                        e => (IdCliente: e.IdCliente, Cliente: e.IdClienteNavigation?.Nombre ?? ""));

            if (filtro.IdCliente.HasValue && filtro.IdCliente > 0)
            {
                movs = movs
                    .Where(m =>
                        m.TipoMovimiento == InventarioRecuperadoRepository.TIPO_ENTREGA &&
                        m.IdMovimiento > 0 &&
                        entregas.TryGetValue(m.IdMovimiento, out var ent) &&
                        ent.IdCliente == filtro.IdCliente)
                    .ToList();
            }

            return movs.Select(m =>
            {
                var esEntrega = m.TipoMovimiento == InventarioRecuperadoRepository.TIPO_ENTREGA &&
                                m.IdMovimiento > 0 &&
                                entregas.ContainsKey(m.IdMovimiento);
                entregas.TryGetValue(m.IdMovimiento, out var ent);
                var prod = m.IdInventarioRecuperadoNavigation.IdProductoNavigation;
                return new ProductoRecuperadoHistorialDto
                {
                    Id = m.Id,
                    Fecha = m.Fecha,
                    IdProducto = prod.Id,
                    Producto = prod.Nombre,
                    Categoria = prod.IdCategoriaNavigation?.Nombre,
                    Medida = prod.IdMedidaNavigation?.Nombre,
                    Cantidad = m.Entrada,
                    Concepto = m.Concepto,
                    IdEntrega = esEntrega ? m.IdMovimiento : null,
                    IdCliente = esEntrega ? ent.IdCliente : null,
                    Cliente = esEntrega ? ent.Cliente : null,
                    Sucursal = m.IdInventarioRecuperadoNavigation.IdSucursalNavigation?.Nombre ?? "",
                    Origen = esEntrega ? "Entrega" : "Manual",
                    PuedeEliminar = m.TipoMovimiento == InventarioRecuperadoRepository.TIPO_MANUAL
                };
            }).ToList();
        }

        public async Task<ProductosRecuperadosDashboardDto> ObtenerDashboard(ProductosRecuperadosFiltroDto filtro)
        {
            filtro ??= new ProductosRecuperadosFiltroDto();
            var movs = await QueryRecuperados(filtro).ToListAsync();

            var dashboard = new ProductosRecuperadosDashboardDto
            {
                TotalRecuperadoPeriodo = movs.Sum(x => x.Entrada),
                TotalMovimientos = movs.Count,
                TotalProductosDistintos = movs.Select(x => x.IdInventarioRecuperadoNavigation.IdProducto).Distinct().Count()
            };

            var ranking = movs
                .GroupBy(x => x.IdInventarioRecuperado)
                .Select(g =>
                {
                    var invRec = g.First().IdInventarioRecuperadoNavigation;
                    var prod = invRec.IdProductoNavigation;
                    return new ProductoRecuperadoRankingDto
                    {
                        IdProducto = prod.Id,
                        Producto = prod.Nombre,
                        Categoria = prod.IdCategoriaNavigation?.Nombre,
                        CantidadTotal = g.Sum(x => x.Entrada),
                        CantidadMovimientos = g.Count(),
                        StockRecuperadoActual = invRec.Stock
                    };
                })
                .OrderByDescending(x => x.CantidadTotal)
                .ToList();

            dashboard.MasRecuperados = ranking.Take(10).ToList();
            dashboard.MenosRecuperados = ranking
                .Where(x => x.CantidadTotal > 0)
                .OrderBy(x => x.CantidadTotal)
                .Take(10)
                .ToList();

            return dashboard;
        }

        public async Task<List<ProductoRecuperadoStockDto>> ListarStockRecuperado(int? idSucursal, string? buscar)
        {
            var q = _db.InventarioRecuperados
                .AsNoTracking()
                .Include(x => x.IdProductoNavigation)
                    .ThenInclude(p => p.IdCategoriaNavigation)
                .Include(x => x.IdSucursalNavigation)
                .Where(x => x.Stock > 0);

            if (idSucursal.HasValue && idSucursal > 0)
                q = q.Where(x => x.IdSucursal == idSucursal);

            if (!string.IsNullOrWhiteSpace(buscar))
                q = q.Where(x => x.IdProductoNavigation.Nombre.Contains(buscar.Trim()));

            return await q
                .OrderBy(x => x.IdProductoNavigation.Nombre)
                .Select(x => new ProductoRecuperadoStockDto
                {
                    IdProducto = x.IdProducto,
                    Producto = x.IdProductoNavigation.Nombre,
                    Categoria = x.IdProductoNavigation.IdCategoriaNavigation != null
                        ? x.IdProductoNavigation.IdCategoriaNavigation.Nombre
                        : null,
                    Sucursal = x.IdSucursalNavigation.Nombre,
                    StockRecuperado = x.Stock
                })
                .ToListAsync();
        }

        public async Task RegistrarManual(
            int idSucursal,
            int idProducto,
            decimal cantidad,
            DateTime fecha,
            string concepto,
            int idUsuario)
        {
            if (idSucursal <= 0 || idProducto <= 0 || cantidad <= 0)
                throw new InvalidOperationException("Sucursal, producto y cantidad son obligatorios.");

            var producto = await _db.Productos.FirstAsync(x => x.Id == idProducto);
            var texto = string.IsNullOrWhiteSpace(concepto)
                ? $"Recuperado manual - {producto.Nombre}"
                : concepto.Trim();

            await _invRecRepo.RegistrarEntrada(
                idSucursal,
                idProducto,
                cantidad,
                fecha,
                texto,
                InventarioRecuperadoRepository.TIPO_MANUAL,
                0,
                idUsuario);
        }

        public Task EliminarMovimientoManual(int idMovimiento)
            => _invRecRepo.EliminarMovimientoManual(idMovimiento);
    }
}
