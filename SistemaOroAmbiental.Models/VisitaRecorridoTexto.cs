namespace SistemaOroAmbiental.Models;

public class VisitaRecorridoTexto
{
    public int IdDia { get; set; }

    public int IdSemana { get; set; }

    public int? IdCamion { get; set; }

    public int? OrdenRecorrido { get; set; }

    public string Dia { get; set; } = "";

    public string Semana { get; set; } = "";

    public string Camion { get; set; } = "";
}
