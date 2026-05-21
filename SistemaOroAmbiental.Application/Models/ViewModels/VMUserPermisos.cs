using System;
using System.Collections.Generic;

namespace SistemaOroAmbiental.Application.Models.ViewModels
{
    public class VMUsuariosPermisoModulo
    {
        public int IdModulo { get; set; }
        public string Modulo { get; set; } = "";
        public string CodigoModulo { get; set; } = "";
        public string? Grupo { get; set; }

        public bool Ver { get; set; }
        public bool Crear { get; set; }
        public bool Editar { get; set; }
        public bool Eliminar { get; set; }
        public bool Exportar { get; set; }
    }

    public class VMUsuariosPermisoUpdate
    {
        public int IdUsuario { get; set; }
        public int IdModulo { get; set; }
        public string Permiso { get; set; } = "";
        public bool Activo { get; set; }
    }

    public class VMUsuariosPermisosLote
    {
        public int IdUsuario { get; set; }
        public List<VMUsuariosPermisoUpdate> Permisos { get; set; } = new();
    }

    public class VMUsuariosPermisosCopiarRol
    {
        public int IdUsuario { get; set; }
        public int IdRol { get; set; }
        public bool ReemplazarExistentes { get; set; } = true;
    }
}