namespace SistemaOroAmbiental.Application.Models.ViewModels
{
    public class VMHojaRutaImprimirRequest
    {
        public int IdCamion { get; set; }
        public int IdSemana { get; set; }
        public int IdDia { get; set; }
        public string? Recorridos { get; set; }
        public DateTime? Fecha { get; set; }
        public bool PersistirProductos { get; set; }
        public List<VMHojaRutaParadaOverride>? Paradas { get; set; }
    }

    public class VMHojaRutaParadaOverride
    {
        public int IdCliente { get; set; }
        public int? IdEstablecimiento { get; set; }
        public List<SistemaOroAmbiental.Models.HojaRutaParadaProductoDto>? Productos { get; set; }
    }
}
