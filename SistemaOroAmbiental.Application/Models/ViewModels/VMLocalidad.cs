namespace SistemaOroAmbiental.Application.Models.ViewModels
{
    public class VMLocalidad
    {
        public int Id { get; set; }

        public string? Codigo { get; set; }

        public string? Nombre { get; set; }

        public int? IdPartido { get; set; }

        public int IdProvincia { get; set; }
    }
}
