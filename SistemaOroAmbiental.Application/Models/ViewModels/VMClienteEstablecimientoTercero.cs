namespace SistemaOroAmbiental.Application.Models.ViewModels
{
    public class VMClienteEstablecimientoTercero
    {
        public int Id { get; set; }
        public int IdEstablecimiento { get; set; }
        public string Nombre { get; set; } = "";
        public string? Cuit { get; set; }
        public string? Telefono { get; set; }
        public string? Email { get; set; }
        public string? Banco { get; set; }
        public string? CbuAlias { get; set; }
        public string? Observaciones { get; set; }
        public bool Activo { get; set; } = true;
        public string? EstablecimientoNombre { get; set; }
    }
}
