using Microsoft.AspNetCore.Authorization;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class ClientesEstadosController : ConfiguracionNombreControllerBase<ClientesEstado>
    {
        public ClientesEstadosController(IConfiguracionNombreService<ClientesEstado> service) : base(service) { }
    }
}
