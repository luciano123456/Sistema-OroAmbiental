using Microsoft.AspNetCore.Authorization;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class BancosController : ConfiguracionNombreControllerBase<Banco>
    {
        public BancosController(IConfiguracionNombreService<Banco> service) : base(service) { }
    }
}
