using Microsoft.AspNetCore.Authorization;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class EstadosUsuariosController : ConfiguracionNombreControllerBase<EstadosUsuario>
    {
        public EstadosUsuariosController(IConfiguracionNombreService<EstadosUsuario> service) : base(service) { }
    }
}
