namespace SistemaOroAmbiental.Application.Models.ViewModels
{
    public class VMProductoPrecioLista
    {
        public int Id { get; set; }

        public int IdListaPrecio { get; set; }

        public string ListaPrecio { get; set; } = "";

        public decimal PrecioVenta { get; set; }

        public decimal PorcRentabilidad { get; set; }
    }

    public class VMProductoPreciosGuardar
    {
        public int IdProducto { get; set; }

        public List<VMProductoPrecioLista> Precios { get; set; } = new();
    }
}
