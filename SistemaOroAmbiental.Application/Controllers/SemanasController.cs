using Microsoft.AspNetCore.Authorization;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class SemanasController : ConfiguracionNombreControllerBase<Semana>
    {
        public SemanasController(IConfiguracionNombreService<Semana> service) : base(service) { }
    }
}
