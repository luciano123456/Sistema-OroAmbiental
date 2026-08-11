namespace SistemaOroAmbiental.Application.Models.ViewModels
{
    public class VMContratoLista
    {
        public int Id { get; set; }
        public int IdCliente { get; set; }
        public string Cliente { get; set; } = "";
        public int IdEstablecimiento { get; set; }
        public int? IdTipoContrato { get; set; }
        public string? TipoContrato { get; set; }
        public string Establecimiento { get; set; } = "";
        public int IdSucursal { get; set; }
        public string? Sucursal { get; set; }
        public DateTime FechaContrato { get; set; }
        public DateTime FechaInicio { get; set; }
        public DateTime FechaVencimiento { get; set; }
        public bool Vigente { get; set; }
        public int CantidadEntregas { get; set; }
        public int CantidadRenovaciones { get; set; }
        public string Etiqueta { get; set; } = "";
        public int? IdUsuarioRegistra { get; set; }
        public DateTime? FechaUsuarioRegistra { get; set; }
        public string? UsuarioRegistra { get; set; }
        public int? IdUsuarioModifica { get; set; }
        public DateTime? FechaUsuarioModifica { get; set; }
        public string? UsuarioModifica { get; set; }
    }

    public class VMContratoGuardar
    {
        public int Id { get; set; }
        public int IdCliente { get; set; }
        public int IdEstablecimiento { get; set; }
        public int? IdTipoContrato { get; set; }
        public DateTime FechaContrato { get; set; }
        public DateTime FechaInicio { get; set; }
        public DateTime FechaVencimiento { get; set; }
    }

    public class VMContratoRenovacion
    {
        public int Id { get; set; }
        public int IdContrato { get; set; }
        public string Tipo { get; set; } = "";
        public DateTime FechaInicio { get; set; }
        public DateTime FechaVencimiento { get; set; }
    }

    public class VMContratoDocumentoItem
    {
        public int Id { get; set; }
        public int IdContrato { get; set; }
        public int? IdTipoContrato { get; set; }
        public string? TipoContrato { get; set; }
        public string NombreArchivo { get; set; } = "";
        public string Extension { get; set; } = "";
        public string Formato { get; set; } = "";
        public long TamanioBytes { get; set; }
        public DateTime FechaUsuarioRegistra { get; set; }
        public string? Usuario { get; set; }
    }

    /// <summary>Datos para reemplazar [campos] en plantillas Word.</summary>
    public class VMContratoDatosPlantilla
    {
        public int Id { get; set; }
        public int IdCliente { get; set; }
        public int IdEstablecimiento { get; set; }
        public int? IdTipoContrato { get; set; }
        public string Cliente { get; set; } = "";
        public string Establecimiento { get; set; } = "";
        public string TipoContrato { get; set; } = "";
        public string Sucursal { get; set; } = "";
        public string CuitCliente { get; set; } = "";
        public string DomicilioCliente { get; set; } = "";
        public string TelefonoCliente { get; set; } = "";
        public string EmailCliente { get; set; } = "";
        public string LocalidadCliente { get; set; } = "";
        public string ProvinciaCliente { get; set; } = "";
        public string CodPostalCliente { get; set; } = "";
        public string CondicionIvaCliente { get; set; } = "";
        public string CuitEstablecimiento { get; set; } = "";
        public string DomicilioEstablecimiento { get; set; } = "";
        public string LocalidadEstablecimiento { get; set; } = "";
        public string ProvinciaEstablecimiento { get; set; } = "";
        public string Profesion { get; set; } = "";
        public string ProfesionCliente { get; set; } = "";
        public string TipoGenerador { get; set; } = "";
        public string TipoGeneradorCliente { get; set; } = "";
        public string NombreCliente { get; set; } = "";
        public string IvaCliente { get; set; } = "";
        public string DiasHorariosCliente { get; set; } = "";
        public string DiaRecoleccion { get; set; } = "";
        public string SemanaRecoleccion { get; set; } = "";
        public string HorarioRecoleccion { get; set; } = "";
        public string Generador { get; set; } = "";
        public string DomicilioGenerador { get; set; } = "";
        public string DomicilioConsultorio { get; set; } = "";
        public string CuitGenerador { get; set; } = "";
        public string TelefonoGenerador { get; set; } = "";
        public string EmailGenerador { get; set; } = "";
        public string LocalidadGenerador { get; set; } = "";
        public string ProvinciaGenerador { get; set; } = "";
        public string Ciudad { get; set; } = "Buenos Aires";
        public string Empresa { get; set; } = "ORO AMBIENTAL GROUP S.R.L.";
        public string OperadorNumero { get; set; } = "7566";
        public string Dia { get; set; } = "";
        public string Mes { get; set; } = "";
        public string Anio { get; set; } = "";
        public string DiaContrato { get; set; } = "";
        public string MesContrato { get; set; } = "";
        public string AnioContrato { get; set; } = "";
        public DateTime FechaContrato { get; set; }
        public DateTime FechaInicio { get; set; }
        public DateTime FechaVencimiento { get; set; }
        public bool Vigente { get; set; }
        public string NombreArchivo { get; set; } = "";
    }
}
