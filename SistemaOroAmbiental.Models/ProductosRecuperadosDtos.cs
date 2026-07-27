namespace SistemaOroAmbiental.Models;

public class ProductoRecuperadoHistorialDto
{
    public int Id { get; set; }
    public DateTime Fecha { get; set; }
    public int IdProducto { get; set; }
    public string Producto { get; set; } = "";
    public string? Categoria { get; set; }
    public string? Medida { get; set; }
    public decimal Cantidad { get; set; }
    public string Concepto { get; set; } = "";
    public int? IdEntrega { get; set; }
    public int? IdCliente { get; set; }
    public string? Cliente { get; set; }
    public string Sucursal { get; set; } = "";
    public string Origen { get; set; } = "";
    public bool PuedeEliminar { get; set; }
}

public class ProductoRecuperadoRankingDto
{
    public int IdProducto { get; set; }
    public string Producto { get; set; } = "";
    public string? Categoria { get; set; }
    public decimal CantidadTotal { get; set; }
    public int CantidadMovimientos { get; set; }
    public decimal StockRecuperadoActual { get; set; }
}

public class ProductosRecuperadosDashboardDto
{
    public decimal TotalRecuperadoPeriodo { get; set; }
    public int TotalMovimientos { get; set; }
    public int TotalProductosDistintos { get; set; }
    public List<ProductoRecuperadoRankingDto> MasRecuperados { get; set; } = new();
    public List<ProductoRecuperadoRankingDto> MenosRecuperados { get; set; } = new();
}

public class ProductoRecuperadoStockDto
{
    public int IdProducto { get; set; }
    public string Producto { get; set; } = "";
    public string? Categoria { get; set; }
    public string Sucursal { get; set; } = "";
    public decimal StockRecuperado { get; set; }
}

public class ProductosRecuperadosFiltroDto
{
    public int? IdSucursal { get; set; }
    public int? IdProducto { get; set; }
    public int? IdCliente { get; set; }
    public DateTime? FechaDesde { get; set; }
    public DateTime? FechaHasta { get; set; }
    public string? Texto { get; set; }
}
