using Microsoft.AspNetCore.Authorization;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class EntregasEstadosController : ConfiguracionNombreControllerBase<EntregasEstado>
    {
        public EntregasEstadosController(IConfiguracionNombreService<EntregasEstado> service) : base(service) { }
    }
}
