namespace SistemaOroAmbiental.Models;

public class OrdenRecorridoOcupanteDto
{
    public bool Ocupado { get; set; }
    public int Posicion { get; set; }
    public int? IdEstablecimiento { get; set; }
    public int? IdCliente { get; set; }
    public string? Nombre { get; set; }
    public string? Cliente { get; set; }
}
