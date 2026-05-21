using Microsoft.AspNetCore.Authorization;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    /// <summary>
    /// Roles del módulo de permisos (tabla Usuarios_Roles).
    /// </summary>
    [Authorize]
    public class UsuariosRolesController : ConfiguracionNombreControllerBase<UsuariosRol>
    {
        public UsuariosRolesController(IConfiguracionNombreService<UsuariosRol> service) : base(service) { }
    }
}
