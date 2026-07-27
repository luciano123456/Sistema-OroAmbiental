namespace SistemaOroAmbiental.Application.Models.ViewModels
{
    public class VMProductoCostoHistorialItem
    {
        public int Id { get; set; }

        public DateTime Fecha { get; set; }

        public decimal CostoAnterior { get; set; }

        public decimal CostoNuevo { get; set; }

        public decimal Variacion { get; set; }

        /// <summary>Porcentaje respecto al costo anterior (null si no aplica, ej. alta desde 0).</summary>
        public decimal? PorcentajeVariacion { get; set; }

        public string Origen { get; set; } = "";

        public string OrigenTexto { get; set; } = "";

        public string Tendencia { get; set; } = "";

        public int? IdCompra { get; set; }

        public string? Usuario { get; set; }

        public string? Detalle { get; set; }

        public string? Proveedor { get; set; }
    }

    public class VMProductoCostoHistorialResponse
    {
        public int IdProducto { get; set; }

        public string NombreProducto { get; set; } = "";

        public decimal CostoActual { get; set; }

        public List<VMProductoCostoHistorialItem> Items { get; set; } = new();
    }
}
