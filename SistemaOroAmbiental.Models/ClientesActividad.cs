namespace SistemaOroAmbiental.Models;

public partial class ClientesActividad
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public virtual ICollection<ClientesEstablecimiento> ClientesEstablecimientos { get; set; } = new List<ClientesEstablecimiento>();
}
