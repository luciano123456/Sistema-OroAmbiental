namespace SistemaOroAmbiental.Models;

public class TerceroPagoAnalisisItem
{
    public int? IdTercero { get; set; }

    public string Nombre { get; set; } = "";

    public string? Cuit { get; set; }

    public int Cantidad { get; set; }

    public decimal Total { get; set; }

    public decimal Porcentaje { get; set; }

    public DateTime? UltimaFecha { get; set; }
}
