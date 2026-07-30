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

        public string? Calle { get; set; }

        public string? Numero { get; set; }

        public string? PisoDepartamento { get; set; }

        public int? IdTipoGenerador { get; set; }

        public string? TipoGenerador { get; set; }

        public int? IdProvincia { get; set; }

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

        public bool Activo { get; set; } = true;

        public int? IdEstado { get; set; }

        public int? IdMotivo { get; set; }

        public string? MotivoDetalle { get; set; }

        public int? IdCalificacion { get; set; }

        public string? Estado { get; set; }

        public string? Motivo { get; set; }

        public string? Calificacion { get; set; }

        public int? NumeroCliente { get; set; }

        public DateTime? FechaInicio { get; set; }

        public DateTime? FechaLicenciaDesde { get; set; }

        public DateTime? FechaLicenciaHasta { get; set; }
    }
}
