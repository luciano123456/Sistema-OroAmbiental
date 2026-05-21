using Microsoft.AspNetCore.Authorization;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class ProvinciasController : ConfiguracionNombreControllerBase<Provincia>
    {
        public ProvinciasController(IConfiguracionNombreService<Provincia> service) : base(service) { }
    }
}
