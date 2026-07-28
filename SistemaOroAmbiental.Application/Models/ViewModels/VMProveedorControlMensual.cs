namespace SistemaOroAmbiental.Application.Models.ViewModels
{
    public class VMProveedorControlMensual
    {
        public int Id { get; set; }

        public int IdProveedor { get; set; }

        public int Anio { get; set; }

        public int Mes { get; set; }

        public bool SinCompra { get; set; }

        public string? Observaciones { get; set; }
    }
}
