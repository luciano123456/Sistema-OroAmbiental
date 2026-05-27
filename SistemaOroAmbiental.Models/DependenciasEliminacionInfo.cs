namespace SistemaOroAmbiental.Models
{
    public class DependenciaEliminacionItem
    {
        public string Clave { get; set; } = "";
        public string Etiqueta { get; set; } = "";
        public int Cantidad { get; set; }
        public string? AccionManual { get; set; }
    }

    public class DependenciasEliminacionInfo
    {
        public List<DependenciaEliminacionItem> Items { get; set; } = new();

        public bool TieneDependencias => Items.Count > 0;

        public string MensajeResumen { get; set; } = "";

        public string InstruccionesPasoAPaso { get; set; } = "";
    }
}
