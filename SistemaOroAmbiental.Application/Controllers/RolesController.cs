using Microsoft.AspNetCore.Authorization;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    /// <summary>
    /// Roles de usuario (tabla Roles) — usado en ABM Usuarios.
    /// </summary>
    [Authorize]
    public class RolesController : ConfiguracionNombreControllerBase<Rol>
    {
        public RolesController(IConfiguracionNombreService<Rol> service) : base(service) { }
    }
}
