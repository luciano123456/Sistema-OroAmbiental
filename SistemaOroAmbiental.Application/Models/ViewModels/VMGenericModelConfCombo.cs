using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Models.ViewModels
{
    public class VMGenericModelConfCombo
    {
        public int Id { get; set; }
        public int IdCombo { get; set; }

        /// <summary>Solo ListasPrecios: producto dueño de una lista específica. Null/0 = general.</summary>
        public int? IdProducto { get; set; }

        public string? Nombre { get; set; }
        public string? NombreCombo { get; set; }
        public string? Codigo { get; set; }
    }
}
