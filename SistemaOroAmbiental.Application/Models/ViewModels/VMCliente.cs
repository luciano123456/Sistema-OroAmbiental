namespace SistemaOroAmbiental.Application.Models.ViewModels
{
    public class VMCliente
    {
        public int Id { get; set; }

        public int IdSucursal { get; set; }

        public string Nombre { get; set; } = "";

        public string? Telefono { get; set; }

        public string? TelefonoAlt { get; set; }

        public string Cuit { get; set; } = "";

        public string? Domicilio { get; set; }

        public int? IdProvincia { get; set; }

        public string? Localidad { get; set; }

        public string? CodPostal { get; set; }

        public int? IdCondicionIva { get; set; }

        public string? Email { get; set; }

        public int? IdProfesion { get; set; }

        public string? Sucursal { get; set; }

        public string? Provincia { get; set; }

        public string? CondicionIva { get; set; }

        public string? Profesion { get; set; }

        public int IdUsuarioRegistra { get; set; }

        public DateTime FechaUsuarioRegistra { get; set; }

        public string? UsuarioRegistra { get; set; }

        public int? IdUsuarioModifica { get; set; }

        public DateTime? FechaUsuarioModifica { get; set; }

        public string? UsuarioModifica { get; set; }
    }
}
