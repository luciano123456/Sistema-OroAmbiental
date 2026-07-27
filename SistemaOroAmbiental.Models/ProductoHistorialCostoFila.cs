namespace SistemaOroAmbiental.Models;

/// <summary>Fila de historial de costo lista para mostrar en UI.</summary>
public class ProductoHistorialCostoFila
{
    public int Id { get; set; }

    public DateTime Fecha { get; set; }

    public decimal CostoAnterior { get; set; }

    public decimal CostoNuevo { get; set; }

    public decimal Variacion { get; set; }

    public decimal? PorcentajeVariacion { get; set; }

    public string Origen { get; set; } = "";

    public int? IdCompra { get; set; }

    public string? Usuario { get; set; }

    public string? Proveedor { get; set; }
}
