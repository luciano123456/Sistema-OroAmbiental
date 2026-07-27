namespace SistemaOroAmbiental.Models;

public partial class ClientesMotivo
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public virtual ICollection<Cliente> Clientes { get; set; } = new List<Cliente>();
}
