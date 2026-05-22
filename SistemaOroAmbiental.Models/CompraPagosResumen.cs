namespace SistemaOroAmbiental.Models;

public class CompraPagoItem
{
    public int IdPago { get; set; }

    public int IdMovimientoCc { get; set; }

    public int IdCuenta { get; set; }

    public int IdSucursal { get; set; }

    public DateTime Fecha { get; set; }

    public string Concepto { get; set; } = "";

    public decimal Importe { get; set; }

    public string Cuenta { get; set; } = "";

    public string Sucursal { get; set; } = "";

    public string? Usuario { get; set; }
}

public class CompraPagosResumen
{
    public int IdCompra { get; set; }

    public decimal ImporteTotal { get; set; }

    public decimal TotalPagado { get; set; }

    public decimal SaldoPendiente { get; set; }

    public bool TienePagos { get; set; }

    public List<CompraPagoItem> Pagos { get; set; } = new();
}
