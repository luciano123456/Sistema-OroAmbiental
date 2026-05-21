namespace SistemaOroAmbiental.Application.Models.ViewModels
{
    public class VMProducto
    {
        public int Id { get; set; }

        public string Nombre { get; set; } = "";

        public int IdCategoria { get; set; }

        public int IdMedida { get; set; }

        public decimal CostoUnitario { get; set; }

        public int StockMinimo { get; set; }

        public string? Categoria { get; set; }

        public string? Medida { get; set; }

        public int IdUsuarioRegistra { get; set; }

        public DateTime FechaUsuarioRegistra { get; set; }

        public string? UsuarioRegistra { get; set; }

        public int? IdUsuarioModifica { get; set; }

        public DateTime? FechaUsuarioModifica { get; set; }

        public string? UsuarioModifica { get; set; }
    }
}
