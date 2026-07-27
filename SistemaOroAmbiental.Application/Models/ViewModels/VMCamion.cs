namespace SistemaOroAmbiental.Application.Models.ViewModels
{
    public class VMCamion
    {
        public int Id { get; set; }

        public string Nombre { get; set; } = "";

        public bool Activo { get; set; } = true;

        public int IdUsuarioRegistra { get; set; }

        public DateTime FechaUsuarioRegistra { get; set; }

        public string? UsuarioRegistra { get; set; }

        public int? IdUsuarioModifica { get; set; }

        public DateTime? FechaUsuarioModifica { get; set; }

        public string? UsuarioModifica { get; set; }
    }
}
