namespace SistemaOroAmbiental.Application.Models.ViewModels
{
    public class VMProveedorCCFiltro
    {
        public int? IdProveedor { get; set; }
        public DateTime? FechaDesde { get; set; }
        public DateTime? FechaHasta { get; set; }
        public string? TipoMovimiento { get; set; }
        public string? Texto { get; set; }
        public bool SoloSaldoActivo { get; set; }
        public string? BuscarProveedor { get; set; }
    }

    public class VMProveedorCCProveedor
    {
        public int Id { get; set; }
        public string Nombre { get; set; } = "";
        public decimal Saldo { get; set; }
    }

    public class VMProveedorCCMovimiento
    {
        public int Id { get; set; }
        public DateTime Fecha { get; set; }
        public string TipoMovimiento { get; set; } = "";
        public string Concepto { get; set; } = "";
        public decimal Debe { get; set; }
        public decimal Haber { get; set; }
        public decimal Saldo { get; set; }
        public bool PuedeEliminar { get; set; }
        public string Origen { get; set; } = "";
    }

    public class VMProveedorCCResumen
    {
        public decimal SaldoAnterior { get; set; }
        public decimal Debe { get; set; }
        public decimal Haber { get; set; }
        public decimal SaldoActual { get; set; }
        public int CantidadMovimientos { get; set; }
    }

    public class VMProveedorCCPago
    {
        public int IdProveedor { get; set; }
        public int IdCuenta { get; set; }
        public DateTime Fecha { get; set; }
        public string Concepto { get; set; } = "";
        public decimal Importe { get; set; }
        public int? IdCompra { get; set; }
    }

    public class VMProveedorCCAjuste
    {
        public int IdProveedor { get; set; }
        public int? IdCuenta { get; set; }
        public DateTime Fecha { get; set; }
        public string Concepto { get; set; } = "";
        public decimal Debe { get; set; }
        public decimal Haber { get; set; }
    }

    public class VMProveedorCCDetalleMovimiento
    {
        public int Id { get; set; }
        public int IdProveedor { get; set; }
        public string TipoMovimiento { get; set; } = "";
        public DateTime Fecha { get; set; }
        public string Concepto { get; set; } = "";
        public decimal Debe { get; set; }
        public decimal Haber { get; set; }
        public decimal Saldo { get; set; }
        public string? Cuenta { get; set; }
        public string? Sucursal { get; set; }
        public bool PuedeEliminar { get; set; }
    }
}
