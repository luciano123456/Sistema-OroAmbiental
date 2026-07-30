using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Models.ViewModels
{
    public class VMGenericModelConfCombo
    {
        public int Id { get; set; }
        public int IdCombo { get; set; }

        public string? Nombre { get; set; }
        public string? NombreCombo { get; set; }
        public string? Codigo { get; set; }
    }
}
