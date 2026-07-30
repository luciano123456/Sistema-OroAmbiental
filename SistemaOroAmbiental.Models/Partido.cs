namespace SistemaOroAmbiental.Models;

public partial class Partido
{
    public int Id { get; set; }

    public string Codigo { get; set; } = null!;

    public string Nombre { get; set; } = null!;

    public int IdProvincia { get; set; }

    public virtual Provincia IdProvinciaNavigation { get; set; } = null!;

    public virtual ICollection<Localidad> Localidades { get; set; } = new List<Localidad>();

    public virtual ICollection<ClientesEstablecimiento> ClientesEstablecimientos { get; set; } = new List<ClientesEstablecimiento>();
}
