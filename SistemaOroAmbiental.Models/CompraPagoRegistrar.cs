namespace SistemaOroAmbiental.Models;

/// <summary>Pago a proveedor vinculado a una compra (alta o sincronización al guardar).</summary>
public class CompraPagoRegistrar
{
    /// <summary>0 = pago nuevo.</summary>
    public int IdPago { get; set; }

    /// <summary>Movimiento CC del pago existente (0 si es nuevo).</summary>
    public int IdMovimientoCc { get; set; }

    public int IdCuenta { get; set; }

    public DateTime Fecha { get; set; }

    public string Concepto { get; set; } = "";

    public decimal Importe { get; set; }
}
