using Microsoft.AspNetCore.Authorization;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class CondicionesIvaController : ConfiguracionNombreControllerBase<CondicionesIva>
    {
        public CondicionesIvaController(IConfiguracionNombreService<CondicionesIva> service) : base(service) { }
    }
}
