using System;
using System.Collections.Generic;

namespace SistemaOroAmbiental.Models;

public partial class UsuariosPermisosUsuario
{
    public int Id { get; set; }

    public int IdUsuario { get; set; }

    public int IdModulo { get; set; }

    public int IdPermiso { get; set; }

    public bool? Activo { get; set; }

    public int? IdUsuarioRegistra { get; set; }

    public DateTime FechaRegistra { get; set; }

    public int? IdUsuarioModifica { get; set; }

    public DateTime? FechaModifica { get; set; }

    public virtual UsuariosModulo IdModuloNavigation { get; set; } = null!;

    public virtual UsuariosPermiso IdPermisoNavigation { get; set; } = null!;

    public virtual User? IdUsuarioModificaNavigation { get; set; }

    public virtual User IdUsuarioNavigation { get; set; } = null!;

    public virtual User? IdUsuarioRegistraNavigation { get; set; }
}
