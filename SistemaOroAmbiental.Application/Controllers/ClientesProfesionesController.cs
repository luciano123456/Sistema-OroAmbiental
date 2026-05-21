using Microsoft.AspNetCore.Authorization;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class ClientesProfesionesController : ConfiguracionNombreControllerBase<ClientesProfesion>
    {
        public ClientesProfesionesController(IConfiguracionNombreService<ClientesProfesion> service) : base(service) { }
    }
}
