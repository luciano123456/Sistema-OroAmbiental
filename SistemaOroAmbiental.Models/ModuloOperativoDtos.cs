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
    /// <summary>Marcado para reprogramar la visita; se muestra en rojo.</summary>
    public bool Reprogramado { get; set; }
    /// <summary>Cliente en periodo de licencia (fechas o estado).</summary>
    public bool EnLicencia { get; set; }
    public DateTime? FechaLicenciaDesde { get; set; }
    public DateTime? FechaLicenciaHasta { get; set; }
    /// <summary>Marcado en UI para no incluirlo en la hoja de ruta (solo sesión).</summary>
    public bool NoExportarHoja { get; set; }
    public string? Observacion { get; set; }
    public string RecorridoTexto { get; set; } = "";
    public List<HojaRutaParadaProductoDto> Productos { get; set; } = new();

    [System.Text.Json.Serialization.JsonIgnore]
    public string? EstadoNombre { get; set; }
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
    public string? Abreviatura { get; set; }
    public int? IdListaPrecio { get; set; }
    /// <summary>Nombre de lista / tipo de pago (Efectivo, Transferencia, C/C, etc.).</summary>
    public string? ListaPrecio { get; set; }
    public decimal Entregadas { get; set; }
    public decimal Retiradas { get; set; }
    /// <summary>Cantidad de retiros marcados como producto no retirado.</summary>
    public decimal NoRetiradas { get; set; }
    public decimal PrecioUnitarioEntrega { get; set; }
    public decimal PrecioUnitarioRetiro { get; set; }
    public decimal PrecioUnitarioNoRetiro { get; set; }
    public decimal SubtotalEntregas { get; set; }
    public decimal SubtotalRetiros { get; set; }
    public decimal SubtotalNoRetiros { get; set; }
}

public class ClienteControlProductoColumnaDto
{
    public int IdProducto { get; set; }
    public string Nombre { get; set; } = "";
    public string? Abreviatura { get; set; }
}

public class ClienteProductoSugeridoDto
{
    public int IdProducto { get; set; }
    public string Producto { get; set; } = "";
    public string? Abreviatura { get; set; }
    public int IdEstablecimiento { get; set; }
    public string? Establecimiento { get; set; }
    public decimal Cantidad { get; set; }
    public int? IdListaPrecio { get; set; }
    public string? ListaPrecio { get; set; }
    public decimal PrecioVenta { get; set; }
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
    /// <summary>Total de productos marcados como no retirados en el mes.</summary>
    public decimal NoRetiradas { get; set; }
    public decimal StockCliente { get; set; }
    public decimal SubtotalEntregas { get; set; }
    public decimal SubtotalRetiros { get; set; }
    public decimal SubtotalNoRetiros { get; set; }
    public decimal AbonoEfectivo { get; set; }
    public decimal AbonoTransferencia { get; set; }
    public DateTime? FechaTransferencia { get; set; }
    public decimal Debe { get; set; }
    public decimal Haber { get; set; }
    /// <summary>Cargo del mes = Debe + intereses asignados al mes.</summary>
    public decimal TotalMes { get; set; }
    /// <summary>Restante del mes = TotalMes − Haber (no incluye meses anteriores).</summary>
    public decimal RestanteMes { get; set; }
    /// <summary>Saldo acumulado al cierre del mes (incluye historial previo).</summary>
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
    /// <summary>Null = interés a nivel cliente (general). Con valor = de ese establecimiento.</summary>
    public int? IdEstablecimiento { get; set; }
    public string? Establecimiento { get; set; }
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
    public int? IdEstablecimiento { get; set; }
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
    public List<ClienteControlProductoColumnaDto> ProductosColumnas { get; set; } = new();
}

public class ClienteStockDto
{
    public int IdProducto { get; set; }
    public string Producto { get; set; } = "";
    public decimal Entregadas { get; set; }
    public decimal Retiradas { get; set; }
    public decimal NoRetiradas { get; set; }
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
    /// <summary>Suma de abonos Efectivo de todas las paradas / secciones.</summary>
    public decimal TotalAbonoEfectivo { get; set; }
    /// <summary>Suma de abonos Transferencia de todas las paradas / secciones.</summary>
    public decimal TotalAbonoTransferencia { get; set; }
    public List<HojaRutaParadaDto> Paradas { get; set; } = new();
    public List<HojaRutaSeccionDto> Secciones { get; set; } = new();
    public List<HojaRutaListaPrecioDto> ListasPrecios { get; set; } = new();
}

public class HojaRutaListaPrecioDto
{
    public int Id { get; set; }
    public string Nombre { get; set; } = "";
    public int? IdTipoPago { get; set; }
    public string? TipoPago { get; set; }
    public string? TipoPagoCodigo { get; set; }
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
    public int? IdEstablecimiento { get; set; }
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
    public bool EnLicencia { get; set; }
    public bool Reprogramado { get; set; }
    public string? ProductosResumen { get; set; }
    public List<HojaRutaParadaProductoDto> Productos { get; set; } = new();
}

public class HojaRutaParadaProductoDto
{
    public int Id { get; set; }
    public int IdProducto { get; set; }
    public string Producto { get; set; } = "";
    public string? Abreviatura { get; set; }
    public decimal Cantidad { get; set; }
    public int? IdListaPrecio { get; set; }
    public string? ListaPrecio { get; set; }
    public int? IdTipoPago { get; set; }
    public string? TipoPago { get; set; }
    public string? TipoPagoCodigo { get; set; }
    public decimal PrecioVenta { get; set; }
    public decimal PrecioEfectivo { get; set; }
    public decimal PrecioTransferencia { get; set; }
    /// <summary>Precio de catálogo de la lista asignada (para marcar desvíos sin otra consulta).</summary>
    public decimal PrecioLista { get; set; }
}

public static class ManifiestoDatosEmpresa
{
    public const string TransportistaCuit = "30-71529832/1";
    public const string TransportistaRazonSocial = "ORO AMBIENTAL GROUP SRL";
    public const string TransportistaDomicilio = "L.M. CAMPOS Nº : 333 Piso: 1";
    public const string TransportistaTelefono = "01144038835";
    public const string TransportistaLocalidad = "CIUDAD AUTONOMA DE BUENOS AIRES";
    public const string OperadorRazonSocial = "HABITAT ECOLOGICO S.A.";
    public const string OperadorIdEstablecimiento = "7566";
    public const string OperadorCuit = "30-66362548/5";
    public const string OperadorDomicilio = "BLANCO ENCALADA Nº : 3040";
    public const string OperadorLocalidad = "LANUS";
    public const string OperadorTelefono = "011-424-68761";
    public const string OrigenDelResiduo = "Generador";
    public const string TipoDestino = "Tratador";
    public const string CategoriaResiduo = "Y1";
    public const string CategoriaDesechoPrincipal = "Y1 -  Desechos clínicos resultantes de la atención médica prestada en hospitales, controles, centros médicos y clínicas para la salud humana y animal (Legislado en la Provincia de Buenos Aires por la Ley 11.347).-";
    public const string CaracteristicaPeligrosidad = "H6.2 -";
    public const string EstadoFisico = "Solido";
    public const string IntercambioEmail = "info@oroambientalgroup.com";

    // Certificado de tratamiento de residuos patogénicos
    public const string CertificadoTratadorRazonSocial = "HABITAT ECOLOGICO S.A.";
    public const string CertificadoTratadorCalle = "BLANCO ENCALADA";
    public const string CertificadoTratadorNumero = "3040";
    public const string CertificadoTratadorLocalidad = "LANUS";
    public const string CertificadoNombreResiduo = "Residuos Patogenicos";
    public const string CertificadoTipoResiduo = "Y1";
    public const string CertificadoPeligrosidad = "H6.2";
    public const string CertificadoEstadoFisico = "Solido";
    public const string CertificadoTipoTratamiento = "P2";
    public const string CertificadoResiduosTratamiento = "RESIDUO SOLIDO URBANO";
    public const string CertificadoDisposicionFinal = "ARX ARCILLEX S.A.";
    public const string CertificadoTextoLegal =
        "El presente documento certifica que los residuos consignados en el mismo fueron tratados en la planta de tratamiento consignada, de acuerdo a los procesos y tecnologías presentadas y aprobadas por el O.P.D.S.. Garantizando, el tratador que se han eliminado o minimizado sus características de peligrosidad de tal manera de poder ser destinados a disposición final autorizada.";
}

public class CertificadoTratamientoItemDto
{
    public int NumeroManifiesto { get; set; }
    public int NumeroCertificado { get; set; }
    public int NumeroOrdenOperaciones { get; set; }
    public DateTime FechaEmision { get; set; }
    public DateTime FechaTratamiento { get; set; }
    public string Cantidad { get; set; } = "";
    public string RazonSocial { get; set; } = "";
    public string CheNro { get; set; } = "";
    public string Calle { get; set; } = "";
    public string NumeroCalle { get; set; } = "";
    public string Piso { get; set; } = "";
    public string Localidad { get; set; } = "";
}

public class CertificadosTratamientoLoteDto
{
    public List<CertificadoTratamientoItemDto> Items { get; set; } = new();
}

public class ClienteDocumentoManifiestoDto
{
    public string Tipo { get; set; } = "";
    public int Id { get; set; }
    public int? IdCamion { get; set; }
    public string Camion { get; set; } = "";
    public int Numero { get; set; }
    public int? NumeroCertificado { get; set; }
    public int? NumeroManifiesto { get; set; }
    public string RazonSocial { get; set; } = "";
    public string Cantidad { get; set; } = "";
    public string Recorrido { get; set; } = "";
    public DateTime Fecha { get; set; }
    public string Usuario { get; set; } = "";
    public bool TieneCertificado { get; set; }
    public int? IdCertificado { get; set; }
}

public class SiguienteNumeroCertificadoDto
{
    public int NumeroCertificado { get; set; }
    public int NumeroOrden { get; set; }
}

public class GuardarHistorialManifiestoResultDto
{
    public List<HistorialManifiestoGuardadoDto> Items { get; set; } = new();
}

public class HistorialManifiestoGuardadoDto
{
    public int Id { get; set; }
    public int Numero { get; set; }
    public int? IdCliente { get; set; }
    public int? IdEstablecimientoDb { get; set; }
}

public class ArchivoIntercambioDto
{
    public string NombreArchivo { get; set; } = "INTERCAMBIO.txt";
    public DateTime Fecha { get; set; }
    public int NumeroInicial { get; set; }
    public string RecorridosParam { get; set; } = "";
    public List<ArchivoIntercambioItemDto> Items { get; set; } = new();
}

public class ArchivoIntercambioItemDto
{
    public int NumeroCliente { get; set; }
    public string CodigoOpds { get; set; } = "";
    public string RazonSocial { get; set; } = "";
    public string Calle { get; set; } = "";
    public string NumeroCalle { get; set; } = "";
    public string CodigoPostal { get; set; } = "";
    public string CodigoLocalidad { get; set; } = "";
    public string CodigoPartido { get; set; } = "";
    public string NombreProvincia { get; set; } = "";
    public string Cuit { get; set; } = "";
    public string NombreIva { get; set; } = "";
    public string CodigoTipoGenerador { get; set; } = "";
    public decimal Kilos { get; set; }
    public int NumeroManifiesto { get; set; }
}

public class ManifiestosHojaDto
{
    public int IdCamion { get; set; }
    public int IdSemana { get; set; }
    public int IdDia { get; set; }
    public string RecorridosParam { get; set; } = "";
    public string Titulo { get; set; } = "";
    public string Nombre { get; set; } = "";
    public DateTime FechaProgramacion { get; set; }
    public int NumeroInicial { get; set; }
    public List<ManifiestoItemDto> Items { get; set; } = new();
}

public class ManifiestoItemDto
{
    public int IdRecorrido { get; set; }
    public int? IdCliente { get; set; }
    public int? IdEstablecimientoDb { get; set; }
    public int IdSemana { get; set; }
    public int IdDia { get; set; }
    public int Posicion { get; set; }
    public int Numero { get; set; }
    public string IdEstablecimiento { get; set; } = "";
    public string RazonSocial { get; set; } = "";
    public string Cuit { get; set; } = "";
    public string Direccion { get; set; } = "";
    public string Localidad { get; set; } = "";
    public string Telefono { get; set; } = "";
    public string Domicilio { get; set; } = "";
    public string Cantidad { get; set; } = "";
    public string Calle { get; set; } = "";
    public string NumeroCalle { get; set; } = "";
    public string Piso { get; set; } = "";
}

public class ManifiestoHistorialDto
{
    public int Id { get; set; }
    public int IdCamion { get; set; }
    public int Numero { get; set; }
    public string Nombre { get; set; } = "";
    public string RazonSocial { get; set; } = "";
    public string Cuit { get; set; } = "";
    public string Recorrido { get; set; } = "";
    public string Zona { get; set; } = "";
    public string Localidad { get; set; } = "";
    public string Cantidad { get; set; } = "";
    public DateTime FechaGeneracion { get; set; }
    public string Usuario { get; set; } = "";
}

public class ManifiestosCamionDto
{
    public int IdCamion { get; set; }
    public string Camion { get; set; } = "";
    public int Total { get; set; }
    public int UltimoNumero { get; set; }
    public int SiguienteNumero { get; set; }
    public DateTime? UltimaFecha { get; set; }
    public List<ManifiestoHistorialDto> Items { get; set; } = new();
}

public class RecorridoOpcionManifiestoDto
{
    public int IdSemana { get; set; }
    public int IdDia { get; set; }
    public string Semana { get; set; } = "";
    public string Dia { get; set; } = "";
    public string Zona { get; set; } = "";
    public string Label { get; set; } = "";
    public int CantidadClientes { get; set; }
}
