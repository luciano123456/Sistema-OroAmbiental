namespace SistemaOroAmbiental.Application.Models.ViewModels
{
    public class VMCajaFiltro
    {
        public DateTime? FechaDesde { get; set; }
        public DateTime? FechaHasta { get; set; }
        public int? IdCuenta { get; set; }
        public int? IdSucursal { get; set; }
        public string? TipoMovimiento { get; set; }
        public string? Texto { get; set; }
    }

    public class VMCajaMovimiento
    {
        public int Id { get; set; }
        public DateTime Fecha { get; set; }
        public string TipoMovimiento { get; set; } = "";
        public int IdMovimiento { get; set; }
        public string Concepto { get; set; } = "";
        public int IdCaja { get; set; }
        public int IdCuenta { get; set; }
        public string? Cuenta { get; set; }
        public string? Sucursal { get; set; }
        public decimal Ingreso { get; set; }
        public decimal Egreso { get; set; }
        public decimal Saldo { get; set; }
        public bool PuedeEditar { get; set; }
        public bool PuedeEliminar { get; set; }
        public string Origen { get; set; } = "";
    }

    public class VMCajaResumen
    {
        public decimal SaldoAnterior { get; set; }
        public decimal Ingresos { get; set; }
        public decimal Egresos { get; set; }
        public decimal SaldoActual { get; set; }
        public int CantidadMovimientos { get; set; }
    }

    public class VMCajaMovimientoManual
    {
        public int? Id { get; set; }
        public DateTime Fecha { get; set; }
        public int IdCuenta { get; set; }
        public string Concepto { get; set; } = "";
        public decimal Importe { get; set; }
    }

    public class VMCajaTransferencia
    {
        public int? Id { get; set; }
        public int? IdMovimientoGrupo { get; set; }
        public DateTime Fecha { get; set; }
        public int IdCuentaOrigen { get; set; }
        public int IdCuentaDestino { get; set; }
        public decimal Importe { get; set; }
        public string NotaInterna { get; set; } = "";
    }

    public class VMCajaDetalleMovimiento
    {
        public int Id { get; set; }
        public DateTime Fecha { get; set; }
        public string TipoMovimiento { get; set; } = "";
        public int IdMovimiento { get; set; }
        public string Concepto { get; set; } = "";
        public int IdCuenta { get; set; }
        public int IdSucursal { get; set; }
        public string? Cuenta { get; set; }
        public string? Sucursal { get; set; }
        public decimal Ingreso { get; set; }
        public decimal Egreso { get; set; }
        public decimal Saldo { get; set; }
        public bool PuedeEditar { get; set; }
        public bool PuedeEliminar { get; set; }
        public string Origen { get; set; } = "";
        public string? TipoTransferencia { get; set; }
    }

    public class VMCajaDetalleTransferencia
    {
        public int IdMovimientoGrupo { get; set; }
        public DateTime Fecha { get; set; }
        public int IdCuentaOrigen { get; set; }
        public int IdSucursalOrigen { get; set; }
        public string? CuentaOrigen { get; set; }
        public decimal ImporteOrigen { get; set; }
        public int IdCuentaDestino { get; set; }
        public int IdSucursalDestino { get; set; }
        public string? CuentaDestino { get; set; }
        public decimal ImporteDestino { get; set; }
        public string NotaInterna { get; set; } = "";
        public bool PuedeEditar { get; set; }
        public bool PuedeEliminar { get; set; }
    }
}
