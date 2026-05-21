using Microsoft.AspNetCore.Authorization;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class GastosCategoriasController : ConfiguracionNombreControllerBase<GastosCategoria>
    {
        public GastosCategoriasController(IConfiguracionNombreService<GastosCategoria> service) : base(service) { }
    }
}
