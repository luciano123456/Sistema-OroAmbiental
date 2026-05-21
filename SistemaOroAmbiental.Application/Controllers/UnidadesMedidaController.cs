using Microsoft.AspNetCore.Authorization;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class UnidadesMedidaController : ConfiguracionNombreControllerBase<UnidadesMedida>
    {
        public UnidadesMedidaController(IConfiguracionNombreService<UnidadesMedida> service) : base(service) { }
    }
}
