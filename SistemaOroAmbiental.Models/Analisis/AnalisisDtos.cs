namespace SistemaOroAmbiental.Models.Analisis;

public class AnalisisFiltro
{
    public DateTime? FechaDesde { get; set; }
    public DateTime? FechaHasta { get; set; }
    public int IdSucursal { get; set; } = -1;
    public int DiasSinMovimiento { get; set; } = 90;
    /// <summary>0 = todos los clientes.</summary>
    public int IdCliente { get; set; }
    /// <summary>Vacío = todos los establecimientos del cliente (si hay cliente).</summary>
    public List<int> IdsEstablecimientos { get; set; } = new();
}

public class AnalisisItemCantidad
{
    public string Clave { get; set; } = "";
    public string Etiqueta { get; set; } = "";
    public string? Subtitulo { get; set; }
    public decimal Cantidad { get; set; }
    public decimal Importe { get; set; }
    public int CantidadMovimientos { get; set; }
}

public class AnalisisRankingClienteItem
{
    public int Id { get; set; }
    public string Nombre { get; set; } = "";
    public int? NumeroCliente { get; set; }
    public decimal Saldo { get; set; }
    public decimal Importe { get; set; }
    public decimal Cantidad { get; set; }
    public string? Subtitulo { get; set; }
}

public class AnalisisRankingProductoItem
{
    public int IdProducto { get; set; }
    public string Producto { get; set; } = "";
    public decimal Cantidad { get; set; }
    public decimal Importe { get; set; }
    public decimal Ganancia { get; set; }
    public string? Subtitulo { get; set; }
}

public class AnalisisGeoItem
{
    public string Etiqueta { get; set; } = "";
    public int CantidadClientes { get; set; }
    public int CantidadEstablecimientos { get; set; }
}

public class AnalisisAlertaItem
{
    public int Id { get; set; }
    public string Titulo { get; set; } = "";
    public string Detalle { get; set; } = "";
    public string Severidad { get; set; } = "info";
    public string? Url { get; set; }
}

public class AnalisisSerieMesItem
{
    public int Anio { get; set; }
    public int Mes { get; set; }
    public string MesNombre { get; set; } = "";
    public decimal Entregado { get; set; }
    public decimal Retirado { get; set; }
    public decimal Cobrado { get; set; }
    public decimal Ganancia { get; set; }
    public decimal Gastos { get; set; }
    public decimal Recuperado { get; set; }
    public decimal UnidadesEntregadas { get; set; }
    public decimal UnidadesRetiradas { get; set; }
    public int Entregas { get; set; }
    public decimal Resultado => Cobrado - Gastos;
    public bool EnPositivo => Resultado >= 0;
}

public class AnalisisMesCardItem
{
    public int Anio { get; set; }
    public int Mes { get; set; }
    public string Periodo { get; set; } = "";
    public decimal Cobrado { get; set; }
    public decimal Gastos { get; set; }
    public decimal Resultado { get; set; }
    public bool CobroMayorGasto { get; set; }
}

public class AnalisisClientesResumen
{
    public int Total { get; set; }
    public int Activos { get; set; }
    public int Suspendidos { get; set; }
    public int Baja { get; set; }
    public int Licencia { get; set; }
    public int LicenciasPorVencer { get; set; }
    public int BajasMesActual { get; set; }
    public decimal SaldoCcTotal { get; set; }
    public int ClientesConDeuda { get; set; }
    public int SinEntregaReciente { get; set; }
    public int EstablecimientosTotal { get; set; }
    public int ClientesConSaldoAFavor { get; set; }
    public string? ClienteFiltroNombre { get; set; }
    public int? ClienteFiltroId { get; set; }
    public List<AnalisisItemCantidad> PorEstado { get; set; } = new();
    public List<AnalisisItemCantidad> PorTipoGenerador { get; set; } = new();
    public List<AnalisisRankingClienteItem> TopDeudores { get; set; } = new();
    public List<AnalisisRankingClienteItem> TopAFavor { get; set; } = new();
    public List<AnalisisAlertaItem> AlertasLicencia { get; set; } = new();
    public List<AnalisisItemCantidad> BajasPorMes { get; set; } = new();
    public List<AnalisisGeoItem> PorPartido { get; set; } = new();
    public List<AnalisisGeoItem> PorLocalidad { get; set; } = new();
    public List<AnalisisRankingClienteItem> SinEntregaRecienteLista { get; set; } = new();
    public List<AnalisisRankingClienteItem> TopPorEntregasPeriodo { get; set; } = new();
    public List<AnalisisEstablecimientoItem> PorEstablecimiento { get; set; } = new();
}

public class AnalisisEstablecimientoItem
{
    public int IdEstablecimiento { get; set; }
    public string Nombre { get; set; } = "";
    public int Entregas { get; set; }
    public decimal UnidadesEntregadas { get; set; }
    public decimal UnidadesRetiradas { get; set; }
    public decimal UnidadesRecuperadas { get; set; }
    public decimal ImporteEntregado { get; set; }
    public decimal Ganancia { get; set; }
    public decimal Cobrado { get; set; }
    public string? Subtitulo { get; set; }
}

public class AnalisisOperacionesResumen
{
    public int EntregasCantidad { get; set; }
    public int RetirosCantidad { get; set; }
    public int LineasEntrega { get; set; }
    public int LineasRetiro { get; set; }
    public decimal EntregadoImporte { get; set; }
    public decimal RetiradoImporte { get; set; }
    public decimal UnidadesEntregadas { get; set; }
    public decimal UnidadesRetiradas { get; set; }
    public decimal GananciaPeriodo { get; set; }
    public decimal CostoPeriodo { get; set; }
    public decimal RecuperadoCantidad { get; set; }
    public decimal RatioRecuperadoPct { get; set; }
    public decimal CobradoPeriodo { get; set; }
    public decimal TicketPromedio { get; set; }
    public decimal SaldoEntregasPeriodo { get; set; }
    public List<AnalisisItemCantidad> MixMovimientos { get; set; } = new();
    public List<AnalisisSerieMesItem> SerieMensual { get; set; } = new();
    public List<AnalisisRankingProductoItem> TopProductosEntregados { get; set; } = new();
    public List<AnalisisRankingProductoItem> TopProductosRetirados { get; set; } = new();
    public List<AnalisisRankingProductoItem> TopProductosRecuperados { get; set; } = new();
    public List<AnalisisRankingProductoItem> TopProductosPorMargen { get; set; } = new();
    public List<AnalisisRankingClienteItem> TopClientesPorImporte { get; set; } = new();
    public List<AnalisisRankingClienteItem> TopClientesPorRetiros { get; set; } = new();
    public List<AnalisisItemCantidad> PorCamion { get; set; } = new();
    public List<AnalisisEstablecimientoItem> PorEstablecimiento { get; set; } = new();
}

public class AnalisisFinanzasResumen
{
    public decimal CobradoPeriodo { get; set; }
    public decimal GastosPeriodo { get; set; }
    public decimal ResultadoPeriodo { get; set; }
    public decimal SaldoEfectivo { get; set; }
    public decimal SaldoBanco { get; set; }
    public decimal SaldoTotal { get; set; }
    public decimal SaldoCcClientes { get; set; }
    public decimal SaldoCcProveedores { get; set; }
    public decimal FacturadoEntregas { get; set; }
    public int CantidadGastos { get; set; }
    public int CantidadCobros { get; set; }
    public decimal PromedioCobro { get; set; }
    public List<AnalisisItemCantidad> CobrosPorForma { get; set; } = new();
    public List<AnalisisItemCantidad> GastosPorCategoria { get; set; } = new();
    public List<AnalisisSerieMesItem> SerieMensual { get; set; } = new();
    public List<AnalisisMesCardItem> PorMes { get; set; } = new();
    public List<AnalisisRankingClienteItem> TopDeudores { get; set; } = new();
    public List<AnalisisRankingClienteItem> TopCobradores { get; set; } = new();
}

public class AnalisisInventarioItem
{
    public int IdProducto { get; set; }
    public string Producto { get; set; } = "";
    public string Sucursal { get; set; } = "";
    public decimal Stock { get; set; }
    public decimal StockMinimo { get; set; }
    public decimal CostoUnitario { get; set; }
    public decimal ValorInversion { get; set; }
    public DateTime? UltimoMovimiento { get; set; }
    public int DiasSinMovimiento { get; set; }
    public string Clasificacion { get; set; } = "";
    public bool EsRecuperado { get; set; }
}

public class AnalisisInventarioResumen
{
    public int ProductosActivos { get; set; }
    public int ProductosBajoMinimo { get; set; }
    public decimal StockVendibleUnidades { get; set; }
    public decimal StockRecuperadoUnidades { get; set; }
    public decimal ValorVendible { get; set; }
    public decimal ValorRecuperado { get; set; }
    public int ItemsSinMovimiento { get; set; }
    public decimal RecuperadoEnPeriodoUnidades { get; set; }
    public List<AnalisisInventarioItem> BajoMinimo { get; set; } = new();
    public List<AnalisisInventarioItem> SinMovimiento { get; set; } = new();
    public List<AnalisisInventarioItem> TopStockVendible { get; set; } = new();
    public List<AnalisisInventarioItem> TopStockRecuperado { get; set; } = new();
    public List<AnalisisRankingProductoItem> TopRecuperadosPeriodo { get; set; } = new();
    public List<AnalisisItemCantidad> VendibleVsRecuperado { get; set; } = new();
}

public class AnalisisRecorridosResumen
{
    public int ParadasActivas { get; set; }
    public int CamionesConRuta { get; set; }
    public int ClientesEnRuta { get; set; }
    public int ClientesActivosFueraDeRuta { get; set; }
    public int ClientesActivosTotal { get; set; }
    public decimal CoberturaPct { get; set; }
    public List<AnalisisItemCantidad> PorCamion { get; set; } = new();
    public List<AnalisisItemCantidad> PorDia { get; set; } = new();
    public List<AnalisisItemCantidad> PorSemana { get; set; } = new();
    public List<AnalisisRankingClienteItem> FueraDeRuta { get; set; } = new();
    public List<AnalisisItemCantidad> RankingCargaCamion { get; set; } = new();
}
