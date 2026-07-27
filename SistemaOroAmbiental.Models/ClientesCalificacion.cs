namespace SistemaOroAmbiental.Models;

public partial class ClientesCalificacion
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public int Nivel { get; set; }

    public virtual ICollection<Cliente> Clientes { get; set; } = new List<Cliente>();
}
