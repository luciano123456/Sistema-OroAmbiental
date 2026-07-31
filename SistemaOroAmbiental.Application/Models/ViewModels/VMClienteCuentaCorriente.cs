namespace SistemaOroAmbiental.Application.Models.ViewModels
{
    public class VMClienteCCFiltro
    {
        public int? IdCliente { get; set; }
        public DateTime? FechaDesde { get; set; }
        public DateTime? FechaHasta { get; set; }
        public string? TipoMovimiento { get; set; }
        public string? Texto { get; set; }
        public bool SoloSaldoActivo { get; set; }
        public string? BuscarCliente { get; set; }
    }

    public class VMClienteCCCliente
    {
        public int Id { get; set; }
        public string Nombre { get; set; } = "";
        public decimal Saldo { get; set; }
    }

    public class VMClienteCCMovimiento
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

    public class VMClienteCCResumen
    {
        public decimal SaldoAnterior { get; set; }
        public decimal Debe { get; set; }
        public decimal Haber { get; set; }
        public decimal SaldoActual { get; set; }
        public int CantidadMovimientos { get; set; }
    }

    public class VMClienteCCCobro
    {
        public int IdCliente { get; set; }
        public int IdCuenta { get; set; }
        public DateTime Fecha { get; set; }
        public string Concepto { get; set; } = "";
        public decimal Importe { get; set; }
    }

    public class VMClienteCCAjuste
    {
        public int IdCliente { get; set; }
        public int? IdCuenta { get; set; }
        public DateTime Fecha { get; set; }
        public string Concepto { get; set; } = "";
        public decimal Debe { get; set; }
        public decimal Haber { get; set; }
    }

    public class VMClienteCCInteres
    {
        public int IdCliente { get; set; }
        public DateTime Fecha { get; set; }
        public string Concepto { get; set; } = "";
        public decimal Importe { get; set; }
        public int? AnioRef { get; set; }
        public int? MesRef { get; set; }
    }

    public class VMClienteCCDetalleMovimiento
    {
        public int Id { get; set; }
        public int IdCliente { get; set; }
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
