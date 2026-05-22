namespace SistemaOroAmbiental.Models;

/// <summary>Cobro de cliente vinculado a una entrega (alta o sincronización al guardar).</summary>
public class EntregaCobroRegistrar
{
    /// <summary>0 = cobro nuevo.</summary>
    public int IdCobro { get; set; }

    /// <summary>Movimiento CC del cobro existente (0 si es nuevo).</summary>
    public int IdMovimientoCc { get; set; }

    public int IdCuenta { get; set; }

    public DateTime Fecha { get; set; }

    public string Concepto { get; set; } = "";

    public decimal Importe { get; set; }
}
