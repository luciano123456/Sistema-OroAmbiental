using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class DiasController : ConfiguracionNombreControllerBase<Dia>
    {
        public DiasController(IConfiguracionNombreService<Dia> service) : base(service) { }

        [AllowAnonymous]
        [HttpGet]
        public override async Task<IActionResult> Lista()
        {
            var items = (await Service.ObtenerTodos()).ToList();
            var lista = OrdenDiasSemana.Ordenar(
                items.Select(e => new VMGenericModel
                {
                    Id = GetId(e),
                    Nombre = GetNombre(e)
                }),
                x => x.Nombre);

            return Ok(lista);
        }
    }
}
