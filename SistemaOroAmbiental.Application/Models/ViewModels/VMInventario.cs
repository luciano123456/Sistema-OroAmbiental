namespace SistemaOroAmbiental.Application.Models.ViewModels
{
    public class VMInventarioFiltro
    {
        public int? IdSucursal { get; set; }
        public int? IdProducto { get; set; }
        public int? IdCategoria { get; set; }
        public DateTime? FechaDesde { get; set; }
        public DateTime? FechaHasta { get; set; }
        public string? TipoMovimiento { get; set; }
        public string? Texto { get; set; }
        public string? BuscarProducto { get; set; }
        public bool SoloBajoMinimo { get; set; }
    }

    public class VMInventarioProductoItem
    {
        public int IdProducto { get; set; }
        public int IdInventario { get; set; }
        public string Nombre { get; set; } = "";
        public string? Categoria { get; set; }
        public string? Medida { get; set; }
        public decimal Stock { get; set; }
        public int StockMinimo { get; set; }
        public bool BajoMinimo { get; set; }
    }

    public class VMInventarioMovimiento
    {
        public int Id { get; set; }
        public DateTime Fecha { get; set; }
        public string TipoMovimiento { get; set; } = "";
        public string Concepto { get; set; } = "";
        public decimal Entrada { get; set; }
        public decimal Salida { get; set; }
        public decimal Stock { get; set; }
        public bool PuedeEliminar { get; set; }
        public string Origen { get; set; } = "";
        public string? Sucursal { get; set; }
        public string? Producto { get; set; }
    }

    public class VMInventarioResumen
    {
        public decimal StockAnterior { get; set; }
        public decimal Entradas { get; set; }
        public decimal Salidas { get; set; }
        public decimal StockActual { get; set; }
        public int CantidadMovimientos { get; set; }
    }

    public class VMInventarioMovimientoManual
    {
        public int? Id { get; set; }
        public int IdSucursal { get; set; }
        public int IdProducto { get; set; }
        public DateTime Fecha { get; set; }
        public string Concepto { get; set; } = "";
        public decimal Cantidad { get; set; }
    }

    public class VMInventarioAjuste
    {
        public int IdSucursal { get; set; }
        public int IdProducto { get; set; }
        public DateTime Fecha { get; set; }
        public string Concepto { get; set; } = "";
        public decimal Entrada { get; set; }
        public decimal Salida { get; set; }
    }

    public class VMInventarioTransferencia
    {
        public int? IdMovimientoGrupo { get; set; }
        public DateTime Fecha { get; set; }
        public int IdSucursalOrigen { get; set; }
        public int IdProducto { get; set; }
        public int IdSucursalDestino { get; set; }
        public decimal Cantidad { get; set; }
        public string NotaInterna { get; set; } = "";
    }

    public class VMInventarioDetalleMovimiento
    {
        public int Id { get; set; }
        public string TipoMovimiento { get; set; } = "";
        public string Origen { get; set; } = "";
        public DateTime Fecha { get; set; }
        public string Concepto { get; set; } = "";
        public decimal Entrada { get; set; }
        public decimal Salida { get; set; }
        public decimal Stock { get; set; }
        public string? Sucursal { get; set; }
        public string? Producto { get; set; }
        public bool PuedeEliminar { get; set; }
    }
}
