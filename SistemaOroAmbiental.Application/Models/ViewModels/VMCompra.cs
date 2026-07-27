namespace SistemaOroAmbiental.Application.Models.ViewModels
{
    public class VMCompraFiltro
    {
        public DateTime? FechaDesde { get; set; }
        public DateTime? FechaHasta { get; set; }
        public int? IdProveedor { get; set; }
        public int? IdSucursal { get; set; }
        public string? Texto { get; set; }
    }

    public class VMCompraLista
    {
        public int Id { get; set; }
        public DateTime Fecha { get; set; }
        public int IdProveedor { get; set; }
        public string Proveedor { get; set; } = "";
        public int IdSucursal { get; set; }
        public string Sucursal { get; set; } = "";
        public decimal Subtotal { get; set; }
        public decimal Descuentos { get; set; }
        public decimal TotalIva { get; set; }
        public decimal ImporteTotal { get; set; }
        public int CantidadProductos { get; set; }
        public string? NotaInterna { get; set; }
        public bool TienePagos { get; set; }
        public decimal TotalPagado { get; set; }
        public decimal SaldoPendiente { get; set; }
    }

    public class VMCompraLinea
    {
        public int Id { get; set; }
        public int IdProducto { get; set; }
        public string Producto { get; set; } = "";
        public string? Medida { get; set; }
        public decimal Cantidad { get; set; }
        public decimal CostoUnitario { get; set; }
        public decimal PorcDescuento { get; set; }
        public decimal PorcIva { get; set; }
        public decimal DescUnitario { get; set; }
        public decimal DescTotal { get; set; }
        public decimal CostoUnitCdesc { get; set; }
        public decimal SubtotalCdesc { get; set; }
        public decimal IvaUnitario { get; set; }
        public decimal IvaTotal { get; set; }
        public decimal CostoUnitFinal { get; set; }
        public decimal SubtotalFinal { get; set; }
    }

    public class VMCompraDetalle
    {
        public int Id { get; set; }
        public DateTime Fecha { get; set; }
        public int IdProveedor { get; set; }
        public string Proveedor { get; set; } = "";
        public int IdSucursal { get; set; }
        public string Sucursal { get; set; } = "";
        public string? NotaInterna { get; set; }
        public decimal Subtotal { get; set; }
        public decimal Descuentos { get; set; }
        public decimal TotalIva { get; set; }
        public decimal ImporteTotal { get; set; }
        public bool TienePagos { get; set; }
        public bool PuedeEditar { get; set; }
        public bool PuedeEliminar { get; set; }
        public decimal TotalPagado { get; set; }
        public decimal SaldoPendiente { get; set; }
        public List<VMCompraLinea> Lineas { get; set; } = new();
    }

    public class VMCompraGuardar
    {
        public int Id { get; set; }
        public DateTime Fecha { get; set; }
        public int IdProveedor { get; set; }
        public int IdSucursal { get; set; }
        public string? NotaInterna { get; set; }
        public List<VMCompraLineaGuardar> Lineas { get; set; } = new();
        public List<VMCompraPagoRegistrar> Pagos { get; set; } = new();
    }

    public class VMCompraPagoRegistrar
    {
        public int IdPago { get; set; }
        public int IdMovimientoCc { get; set; }
        public int IdCompra { get; set; }
        public int IdCuenta { get; set; }
        public DateTime Fecha { get; set; }
        public string Concepto { get; set; } = "";
        public decimal Importe { get; set; }
    }

    public class VMCompraLineaGuardar
    {
        public int Id { get; set; }
        public int IdProducto { get; set; }
        public decimal Cantidad { get; set; }
        public decimal CostoUnitario { get; set; }
        public decimal PorcDescuento { get; set; }
        public decimal PorcIva { get; set; }
    }

    public class VMCompraPagoItem
    {
        public int IdPago { get; set; }
        public int IdMovimientoCc { get; set; }
        public int IdCuenta { get; set; }
        public int IdSucursal { get; set; }
        public DateTime Fecha { get; set; }
        public string Concepto { get; set; } = "";
        public decimal Importe { get; set; }
        public string Cuenta { get; set; } = "";
        public string Sucursal { get; set; } = "";
        public string? Usuario { get; set; }
    }

    public class VMCompraPagosResumen
    {
        public int IdCompra { get; set; }
        public decimal ImporteTotal { get; set; }
        public decimal TotalPagado { get; set; }
        public decimal SaldoPendiente { get; set; }
        public bool TienePagos { get; set; }
        public List<VMCompraPagoItem> Pagos { get; set; } = new();
    }
}
