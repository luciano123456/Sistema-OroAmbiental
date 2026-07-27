using Microsoft.AspNetCore.Authorization;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class TiposContratosController : ConfiguracionNombreControllerBase<TiposContrato>
    {
        public TiposContratosController(IConfiguracionNombreService<TiposContrato> service) : base(service) { }
    }
}
