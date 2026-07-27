namespace SistemaOroAmbiental.Models;

public class ProductoPrecioListaDto
{
    public int Id { get; set; }

    public int IdListaPrecio { get; set; }

    public string ListaPrecio { get; set; } = "";

    public decimal PrecioVenta { get; set; }

    public decimal PorcRentabilidad { get; set; }
}
