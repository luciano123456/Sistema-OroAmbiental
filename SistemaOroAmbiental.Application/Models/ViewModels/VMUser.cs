using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Models.ViewModels
{
    public class VMUser
    {
        public int Id { get; set; }

        public string Usuario { get; set; } = null!;

        public string Nombre { get; set; } = null!;

        public string Apellido { get; set; } = null!;

        public string? Dni { get; set; }

        public string? Telefono { get; set; }

        public string? Direccion { get; set; }

        public int IdRol { get; set; }

        public string Contrasena { get; set; } = null!;
        public string ContrasenaNueva { get; set; } = null!;
        public string Estado { get; set; } = null!;
        public string UsuariosRol { get; set; } = null!;
        public int CambioAdmin { get; set; } = 0;

        public int IdEstado { get; set; }

        public bool Activo { get; set; } = true;

        public bool EnLinea { get; set; }

        public DateTime? FechaUltimaActividad { get; set; }

        public string? UltimoModulo { get; set; }

        public string? AvatarColor { get; set; }

        public string? AvatarIcono { get; set; }

        public string? AvatarFoto { get; set; }
    }

}
