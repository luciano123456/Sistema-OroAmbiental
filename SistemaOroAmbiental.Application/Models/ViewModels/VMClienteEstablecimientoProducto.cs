namespace SistemaOroAmbiental.Application.Models.ViewModels
{
    public class VMClienteEstablecimientoProducto
    {
        public int Id { get; set; }
        public int IdEstablecimiento { get; set; }
        public int IdProducto { get; set; }
        public decimal Cantidad { get; set; }
        public int? IdListaPrecio { get; set; }
        public decimal PrecioVenta { get; set; }
        public string? Producto { get; set; }
        public string? Abreviatura { get; set; }
        public string? ListaPrecio { get; set; }
    }
}
