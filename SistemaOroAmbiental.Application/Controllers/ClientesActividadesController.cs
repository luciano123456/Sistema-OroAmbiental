using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class ClientesActividadesController : ConfiguracionNombreControllerBase<ClientesActividad>
    {
        public ClientesActividadesController(IConfiguracionNombreService<ClientesActividad> service) : base(service) { }
    }
}
