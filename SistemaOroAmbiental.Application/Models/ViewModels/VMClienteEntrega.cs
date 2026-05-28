namespace SistemaOroAmbiental.Application.Models.ViewModels
{
    public class VMClienteEntregaFiltro
    {
        public DateTime? FechaDesde { get; set; }
        public DateTime? FechaHasta { get; set; }
        public int? IdCliente { get; set; }
        public int? IdContrato { get; set; }
        public int? IdEstado { get; set; }
        public string? Texto { get; set; }
    }

    public class VMClienteEntregaLista
    {
        public int Id { get; set; }
        public DateTime Fecha { get; set; }
        public int IdContrato { get; set; }
        public int IdCliente { get; set; }
        public string Cliente { get; set; } = "";
        public string Establecimiento { get; set; } = "";
        public int? IdEstado { get; set; }
        public string? Estado { get; set; }
        public decimal Subtotal { get; set; }
        public decimal Descuentos { get; set; }
        public decimal TotalIva { get; set; }
        public decimal ImporteTotal { get; set; }
        public decimal ImporteAbonado { get; set; }
        public decimal Saldo { get; set; }
        public int CantidadProductos { get; set; }
        public string? NotaInterna { get; set; }
        public bool TieneCobros { get; set; }
    }

    public class VMClienteEntregaLinea
    {
        public int Id { get; set; }
        public int IdProducto { get; set; }
        public int TipoMovimiento { get; set; } = 1; // 1=Entrega, 2=Retiro
        public string Producto { get; set; } = "";
        public string? Medida { get; set; }
        public decimal Cantidad { get; set; }
        public decimal PrecioVenta { get; set; }
        public decimal CostoUnitario { get; set; }
        public decimal PorcDescuento { get; set; }
        public decimal PorcIva { get; set; }
        public decimal DescUnitario { get; set; }
        public decimal DescTotal { get; set; }
        public decimal PrecioVentacDesc { get; set; }
        public decimal SubtotalcDesc { get; set; }
        public decimal IvaUnitario { get; set; }
        public decimal TotalIva { get; set; }
        public decimal PrecioVentaFinal { get; set; }
        public decimal SubtotalFinal { get; set; }
        public decimal Ganancia { get; set; }
    }

    public class VMClienteEntregaDetalle
    {
        public int Id { get; set; }
        public DateTime Fecha { get; set; }
        public int IdContrato { get; set; }
        public int IdCliente { get; set; }
        public string Cliente { get; set; } = "";
        public string Establecimiento { get; set; } = "";
        public int IdSucursal { get; set; }
        public string Sucursal { get; set; } = "";
        public int? IdEstado { get; set; }
        public string? Estado { get; set; }
        public string? NotaInterna { get; set; }
        public string? NotaCliente { get; set; }
        public decimal Subtotal { get; set; }
        public decimal Descuentos { get; set; }
        public decimal TotalIva { get; set; }
        public decimal ImporteTotal { get; set; }
        public decimal ImporteAbonado { get; set; }
        public decimal Saldo { get; set; }
        public bool TieneCobros { get; set; }
        public bool PuedeEditar { get; set; }
        public bool PuedeEliminar { get; set; }
        public List<VMClienteEntregaLinea> Lineas { get; set; } = new();
    }

    public class VMClienteEntregaGuardar
    {
        public int Id { get; set; }
        public DateTime Fecha { get; set; }
        public int IdContrato { get; set; }
        public int? IdEstado { get; set; }
        public string? NotaInterna { get; set; }
        public string? NotaCliente { get; set; }
        public List<VMClienteEntregaLineaGuardar> Lineas { get; set; } = new();
        public List<VMClienteEntregaCobroRegistrar> Cobros { get; set; } = new();
    }

    public class VMClienteEntregaLineaGuardar
    {
        public int Id { get; set; }
        public int IdProducto { get; set; }
        public int TipoMovimiento { get; set; } = 1; // 1=Entrega, 2=Retiro
        public decimal Cantidad { get; set; }
        public decimal PrecioVenta { get; set; }
        public decimal CostoUnitario { get; set; }
        public decimal PorcDescuento { get; set; }
        public decimal PorcIva { get; set; }
    }

    public class VMClienteEntregaCobroRegistrar
    {
        public int IdCobro { get; set; }
        public int IdMovimientoCc { get; set; }
        public int IdEntrega { get; set; }
        public int IdCuenta { get; set; }
        public DateTime Fecha { get; set; }
        public string Concepto { get; set; } = "";
        public decimal Importe { get; set; }
    }

    public class VMClienteEntregaCobroItem
    {
        public int IdCobro { get; set; }
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

    public class VMClienteEntregaCobrosResumen
    {
        public int IdEntrega { get; set; }
        public decimal ImporteTotal { get; set; }
        public decimal TotalCobrado { get; set; }
        public decimal SaldoPendiente { get; set; }
        public bool TieneCobros { get; set; }
        public List<VMClienteEntregaCobroItem> Cobros { get; set; } = new();
    }

}
