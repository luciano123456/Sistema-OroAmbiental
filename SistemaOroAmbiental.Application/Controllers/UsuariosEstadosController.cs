using Microsoft.AspNetCore.Authorization;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    /// <summary>
    /// Estados de usuario (tabla Usuarios_Estados).
    /// </summary>
    [Authorize]
    public class UsuariosEstadosController : ConfiguracionNombreControllerBase<UsuariosEstado>
    {
        public UsuariosEstadosController(IConfiguracionNombreService<UsuariosEstado> service) : base(service) { }
    }
}
