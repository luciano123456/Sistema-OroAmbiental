namespace SistemaOroAmbiental.Models;

public partial class ClientesTipoGenerador
{
    public int Id { get; set; }

    public string Codigo { get; set; } = null!;

    public string Nombre { get; set; } = null!;

    public virtual ICollection<Cliente> Clientes { get; set; } = new List<Cliente>();

    public virtual ICollection<ClientesEstablecimiento> ClientesEstablecimientos { get; set; } = new List<ClientesEstablecimiento>();
}
