namespace SistemaOroAmbiental.Application.Models.ViewModels
{
    public class VMClienteEstablecimientoProducto
    {
        public int Id { get; set; }
        public int IdEstablecimiento { get; set; }
        public int IdProducto { get; set; }
        public decimal Cantidad { get; set; }
        public string? Producto { get; set; }
    }
}
