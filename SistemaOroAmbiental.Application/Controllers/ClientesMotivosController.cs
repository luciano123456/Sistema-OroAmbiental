using Microsoft.AspNetCore.Authorization;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class ClientesMotivosController : ConfiguracionNombreControllerBase<ClientesMotivo>
    {
        public ClientesMotivosController(IConfiguracionNombreService<ClientesMotivo> service) : base(service) { }
    }
}
