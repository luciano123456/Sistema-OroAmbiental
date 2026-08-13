using Microsoft.AspNetCore.Authorization;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class DiasController : ConfiguracionNombreControllerBase<Dia>
    {
        public DiasController(IConfiguracionNombreService<Dia> service) : base(service) { }

        protected override string NombreEntidadSingular => "día";
    }
}
