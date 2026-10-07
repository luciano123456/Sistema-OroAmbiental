namespace SistemaOroAmbiental.Application.Models.ViewModels
{
    public class VMFirma
    {
        public int Id { get; set; }

        public string Nombre { get; set; } = "";

        public string? FirmaArchivo { get; set; }

        public string? FirmaUrl { get; set; }

        public string? FirmaBase64 { get; set; }

        public bool QuitarFirma { get; set; }

        public bool Activo { get; set; } = true;

        public int IdUsuarioRegistra { get; set; }

        public DateTime FechaUsuarioRegistra { get; set; }

        public string? UsuarioRegistra { get; set; }

        public int? IdUsuarioModifica { get; set; }

        public DateTime? FechaUsuarioModifica { get; set; }

        public string? UsuarioModifica { get; set; }
    }
}
