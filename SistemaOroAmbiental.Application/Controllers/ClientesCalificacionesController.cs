using Microsoft.AspNetCore.Authorization;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class ClientesCalificacionesController : ConfiguracionNombreControllerBase<ClientesCalificacion>
    {
        public ClientesCalificacionesController(IConfiguracionNombreService<ClientesCalificacion> service) : base(service) { }
    }
}
