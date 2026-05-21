using Microsoft.AspNetCore.Authorization;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class ProductosCategoriasController : ConfiguracionNombreControllerBase<ProductosCategoria>
    {
        public ProductosCategoriasController(IConfiguracionNombreService<ProductosCategoria> service) : base(service) { }
    }
}
