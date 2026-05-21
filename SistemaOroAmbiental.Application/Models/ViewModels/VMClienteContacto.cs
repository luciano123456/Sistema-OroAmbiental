namespace SistemaOroAmbiental.Application.Models.ViewModels
{
    public class VMClienteContacto
    {
        public int Id { get; set; }

        public int IdCliente { get; set; }

        public string Nombre { get; set; } = "";

        public string? Puesto { get; set; }

        public string? Telefono { get; set; }

        public string? TelefonoAlt { get; set; }

        public string? Email { get; set; }
    }
}
