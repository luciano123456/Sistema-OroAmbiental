using System;
using System.Collections.Generic;

namespace SistemaOroAmbiental.Models;

public partial class UsuariosPermiso
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public string Codigo { get; set; } = null!;

    public string? Descripcion { get; set; }

    public int Orden { get; set; }

    public bool? Activo { get; set; }

    public int? IdModulo { get; set; }

    public virtual UsuariosModulo? IdModuloNavigation { get; set; }

    public virtual ICollection<UsuariosPermisosUsuario> UsuariosPermisosUsuarios { get; set; } = new List<UsuariosPermisosUsuario>();

    public virtual ICollection<UsuariosRolesPermiso> UsuariosRolesPermisos { get; set; } = new List<UsuariosRolesPermiso>();
}
