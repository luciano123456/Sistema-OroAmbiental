namespace SistemaOroAmbiental.Application.Models.ViewModels
{
    public class VMProveedor
    {
        public int Id { get; set; }

        public string Nombre { get; set; } = "";

        public string? Telefono { get; set; }

        public string? Email { get; set; }

        public int IdCondicionIva { get; set; }

        public string Cuit { get; set; } = "";

        public int? IdBanco { get; set; }

        public string? AliasBancario { get; set; }

        public string? CbuBancario { get; set; }

        public string? CondicionIva { get; set; }

        public string? Banco { get; set; }

        public int IdUsuarioRegistra { get; set; }

        public DateTime FechaUsuarioRegistra { get; set; }

        public string? UsuarioRegistra { get; set; }

        public int? IdUsuarioModifica { get; set; }

        public DateTime? FechaUsuarioModifica { get; set; }

        public string? UsuarioModifica { get; set; }
    }
}
