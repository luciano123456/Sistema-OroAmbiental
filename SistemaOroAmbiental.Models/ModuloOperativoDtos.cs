namespace SistemaOroAmbiental.Models;

public class ClientesDashboardDto
{
    public int Total { get; set; }
    public int Activos { get; set; }
    public int Suspendidos { get; set; }
    public int Baja { get; set; }
    public int Licencia { get; set; }
    public int LicenciasPorVencer { get; set; }
    public int BajasMesActual { get; set; }
    public int StockClientesActivos { get; set; }
    public List<ClientesBajaMesDto> BajasPorMes { get; set; } = new();
    public List<ClienteLicenciaAlertaDto> AlertasLicencia { get; set; } = new();
}

public class ClientesBajaMesDto
{
    public int Anio { get; set; }
    public int Mes { get; set; }
    public string MesNombre { get; set; } = "";
    public int Cantidad { get; set; }
}

public class ClienteLicenciaAlertaDto
{
    public int Id { get; set; }
    public string Nombre { get; set; } = "";
    public DateTime? FechaLicenciaHasta { get; set; }
    public int DiasRestantes { get; set; }
}

public class RecorridosMatrizDto
{
    public int Id { get; set; }
    public int IdCamion { get; set; }
    public string Camion { get; set; } = "";
    public int IdSemana { get; set; }
    public string Semana { get; set; } = "";
    public int IdDia { get; set; }
    public string Dia { get; set; } = "";
    public string Zona { get; set; } = "";
    public string? HorarioSalida { get; set; }
}

public class ClientesRecorridoDto
{
    public int Id { get; set; }
    public int IdCliente { get; set; }
    public string Cliente { get; set; } = "";
    public int? IdEstablecimiento { get; set; }
    public string? Establecimiento { get; set; }
    public string? Domicilio { get; set; }
    public string? Localidad { get; set; }
    public int IdCamion { get; set; }
    public string Camion { get; set; } = "";
    public int IdSemana { get; set; }
    public string Semana { get; set; } = "";
    public int IdDia { get; set; }
    public string Dia { get; set; } = "";
    public string Zona { get; set; } = "";
    public int Posicion { get; set; }
    public bool Activo { get; set; }
    public string? Observacion { get; set; }
    public string RecorridoTexto { get; set; } = "";
}

public class RecorridoSugeridoDto
{
    public int IdEstablecimiento { get; set; }
    public int IdCliente { get; set; }
    public string Cliente { get; set; } = "";
    public string Establecimiento { get; set; } = "";
    public string? Domicilio { get; set; }
    public string? Localidad { get; set; }
    public string Horario { get; set; } = "";
    public bool YaEnRecorrido { get; set; }
}

public class ClienteControlProductoMesDto
{
    public int IdProducto { get; set; }
    public string Producto { get; set; } = "";
    public decimal Entregadas { get; set; }
    public decimal Retiradas { get; set; }
    public decimal PrecioUnitarioEntrega { get; set; }
    public decimal PrecioUnitarioRetiro { get; set; }
    public decimal SubtotalEntregas { get; set; }
    public decimal SubtotalRetiros { get; set; }
}

public class ClienteControlMensualDto
{
    public int? IdControl { get; set; }
    public int Anio { get; set; }
    public int Mes { get; set; }
    public string MesNombre { get; set; } = "";
    public DateTime? FechaVisita { get; set; }
    public decimal Entregadas { get; set; }
    public decimal Retiradas { get; set; }
    public decimal StockCliente { get; set; }
    public decimal SubtotalEntregas { get; set; }
    public decimal SubtotalRetiros { get; set; }
    public decimal AbonoEfectivo { get; set; }
    public decimal AbonoTransferencia { get; set; }
    public DateTime? FechaTransferencia { get; set; }
    public decimal Debe { get; set; }
    public decimal Haber { get; set; }
    public decimal Saldo { get; set; }
    public int CajasAFavor { get; set; }
    public bool SinEntrega { get; set; }
    public string? Observaciones { get; set; }
    public bool TieneOverride { get; set; }
    public int CantidadIntereses { get; set; }
    public decimal TotalIntereses { get; set; }
    public List<ClienteInteresMovDto> Intereses { get; set; } = new();
    public List<ClienteControlProductoMesDto> Productos { get; set; } = new();
}

public class ClienteInteresMovDto
{
    public int Id { get; set; }
    public DateTime Fecha { get; set; }
    public string Concepto { get; set; } = "";
    public decimal Importe { get; set; }
    public int? AnioRef { get; set; }
    public int? MesRef { get; set; }
    public string? MesNombreRef { get; set; }
}

public class ClienteControlAnualDto
{
    public int Anio { get; set; }
    public int IdCliente { get; set; }
    public string Cliente { get; set; } = "";
    public int? NumeroCliente { get; set; }
    public decimal StockActual { get; set; }
    public decimal TotalDebe { get; set; }
    public decimal TotalHaber { get; set; }
    public decimal TotalSaldo { get; set; }
    public List<ClienteControlMensualDto> Meses { get; set; } = new();
    public List<ClientesRecorridoDto> Recorridos { get; set; } = new();
}

public class ClienteControlFiltradoDto
{
    public int IdCliente { get; set; }
    public string Cliente { get; set; } = "";
    public int? NumeroCliente { get; set; }
    public decimal StockActual { get; set; }
    public decimal TotalDebe { get; set; }
    public decimal TotalHaber { get; set; }
    public decimal TotalSaldo { get; set; }
    public bool DatosParciales { get; set; }
    public List<ClienteControlMensualDto> Filas { get; set; } = new();
    public List<ClientesRecorridoDto> Recorridos { get; set; } = new();
    public List<ClienteInteresMovDto> Intereses { get; set; } = new();
}

public class ClienteStockDto
{
    public int IdProducto { get; set; }
    public string Producto { get; set; } = "";
    public decimal Entregadas { get; set; }
    public decimal Retiradas { get; set; }
    public decimal EnPoderCliente { get; set; }
}

public class ProveedorControlMensualDto
{
    public int? IdControl { get; set; }
    public int Anio { get; set; }
    public int Mes { get; set; }
    public string MesNombre { get; set; } = "";
    public int CantCompras { get; set; }
    public decimal TotalCompras { get; set; }
    public decimal TotalPagos { get; set; }
    public decimal Debe { get; set; }
    public decimal Haber { get; set; }
    public decimal Saldo { get; set; }
    public bool SinCompra { get; set; }
    public string? Observaciones { get; set; }
    public bool TieneOverride { get; set; }
}

public class ProveedorControlFiltradoDto
{
    public int IdProveedor { get; set; }
    public string Proveedor { get; set; } = "";
    public string? Cuit { get; set; }
    public decimal SaldoActual { get; set; }
    public decimal TotalDebe { get; set; }
    public decimal TotalHaber { get; set; }
    public decimal TotalSaldo { get; set; }
    public bool DatosParciales { get; set; }
    public List<ProveedorControlMensualDto> Filas { get; set; } = new();
}

public class LibroDiarioFiltroDto
{
    public DateTime? FechaDesde { get; set; }
    public DateTime? FechaHasta { get; set; }
    public bool? EsBancario { get; set; }
    public int? IdCliente { get; set; }
    public int? IdCamion { get; set; }
    public int? IdSemana { get; set; }
    public int? IdDia { get; set; }
    public string? Texto { get; set; }
}

public class LibroDiarioResumenDto
{
    public decimal TotalDebe { get; set; }
    public decimal TotalHaber { get; set; }
    public decimal SaldoFinal { get; set; }
    public int CantidadMovimientos { get; set; }
}

public class LibroDiarioMovimientoDto
{
    public int Id { get; set; }
    public DateTime Fecha { get; set; }
    public int? IdConcepto { get; set; }
    public string Concepto { get; set; } = "";
    public int? IdCliente { get; set; }
    public string? Cliente { get; set; }
    public int? IdProveedor { get; set; }
    public string? Proveedor { get; set; }
    public string? RecorridoTexto { get; set; }
    public decimal Unidades { get; set; }
    public decimal PrecioUnitario { get; set; }
    public decimal Debe { get; set; }
    public decimal Haber { get; set; }
    public decimal PorcIva { get; set; }
    public decimal Iva { get; set; }
    public decimal OtrosImp { get; set; }
    public decimal Total { get; set; }
    public decimal Saldo { get; set; }
    public string? FormaPago { get; set; }
    public bool EsBancario { get; set; }
}

public class HojaRutaDto
{
    public int IdCamion { get; set; }
    public string Camion { get; set; } = "";
    public int IdSemana { get; set; }
    public string Semana { get; set; } = "";
    public int IdDia { get; set; }
    public string Dia { get; set; } = "";
    public string Zona { get; set; } = "";
    public string Titulo { get; set; } = "";
    public DateTime? FechaReferencia { get; set; }
    public string? Salida { get; set; }
    public decimal PrecioDescartadorGrande { get; set; }
    public decimal PrecioDescartadorChico { get; set; }
    public List<HojaRutaParadaDto> Paradas { get; set; } = new();
    public List<HojaRutaSeccionDto> Secciones { get; set; } = new();
}

public class HojaRutaSeccionDto
{
    public string Titulo { get; set; } = "";
    public string Semana { get; set; } = "";
    public string Dia { get; set; } = "";
    public string Zona { get; set; } = "";
    public string? Salida { get; set; }
    public List<HojaRutaParadaDto> Paradas { get; set; } = new();
}

public class HojaRutaParadaDto
{
    public int Posicion { get; set; }
    public int IdCliente { get; set; }
    public string Cliente { get; set; } = "";
    public string? Establecimiento { get; set; }
    public string Domicilio { get; set; } = "";
    public string Localidad { get; set; } = "";
    public string Telefono { get; set; } = "";
    public string Horario { get; set; } = "";
    public decimal AbonoEfectivo { get; set; }
    public decimal AbonoTransferencia { get; set; }
    public string? Observacion { get; set; }
    /// <summary>Texto de saldo para imprimir (debe / a favor).</summary>
    public string? SaldoResumen { get; set; }
    public decimal SaldoActual { get; set; }
    /// <summary>debe | favor | cero</summary>
    public string SaldoTone { get; set; } = "cero";
    public string AlertaTipo { get; set; } = "normal";
    public bool Activo { get; set; } = true;
}
