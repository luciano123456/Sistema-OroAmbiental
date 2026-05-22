using System;
using System.Collections.Generic;

namespace SistemaOroAmbiental.Models;

public partial class UsuariosRol
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public virtual ICollection<User> Usuarios { get; set; } = new List<User>();

    public virtual ICollection<UsuariosRolesPermiso> UsuariosRolesPermisos { get; set; } = new List<UsuariosRolesPermiso>();
}
