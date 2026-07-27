namespace SistemaOroAmbiental.Application.Models.ViewModels
{
    public class VMLibroDiarioFiltro
    {
        public DateTime? FechaDesde { get; set; }
        public DateTime? FechaHasta { get; set; }
        public bool? EsBancario { get; set; }
        public int? IdCliente { get; set; }
        public int? IdCamion { get; set; }
        public int? IdSemana { get; set; }
        public int? IdDia { get; set; }
        public string? Texto { get; set; }
    }

    public class VMLibroDiarioResumen
    {
        public decimal SaldoAnterior { get; set; }
        public decimal TotalDebe { get; set; }
        public decimal TotalHaber { get; set; }
        public decimal SaldoFinal { get; set; }
        public int CantidadMovimientos { get; set; }
    }

    public class VMLibroDiarioConcepto
    {
        public int Id { get; set; }
        public string Nombre { get; set; } = "";
        public decimal PrecioUnitario { get; set; }
        public int? IdProducto { get; set; }
        public bool AfectaInventario { get; set; }
        public string? TipoStock { get; set; }
    }

    public class VMLibroDiarioAutocomplete
    {
        public int Id { get; set; }
        public string Nombre { get; set; } = "";
    }
}
