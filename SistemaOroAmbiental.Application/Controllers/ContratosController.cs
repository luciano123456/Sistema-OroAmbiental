using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.Application.Helpers;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class ContratosController : Controller
    {
        private readonly IContratosService _service;
        private readonly SistemaOroAmbientalContext _db;

        public ContratosController(IContratosService service, SistemaOroAmbientalContext db)
        {
            _service = service;
            _db = db;
        }

        [AllowAnonymous]
        public IActionResult Index() => View();

        [HttpGet]
        public async Task<IActionResult> Lista(int? idCliente, bool? soloVigentes, string? texto)
        {
            var lista = await _service.ListarFiltrado(idCliente, soloVigentes, texto);
            return Ok(lista.Select(MapLista).ToList());
        }

        [HttpGet]
        public async Task<IActionResult> ListaGrilla()
        {
            var items = (await _service.ObtenerTodos()).ToList();
            var ids = items.Select(x => x.Id).ToList();

            var entregasPorContrato = await _db.ClientesEntregas
                .AsNoTracking()
                .Where(x => ids.Contains(x.IdContrato))
                .GroupBy(x => x.IdContrato)
                .Select(g => new { Id = g.Key, Cant = g.Count() })
                .ToDictionaryAsync(x => x.Id, x => x.Cant);

            var renovPorContrato = await _db.ContratosRenovaciones
                .AsNoTracking()
                .Where(x => ids.Contains(x.IdContrato))
                .GroupBy(x => x.IdContrato)
                .Select(g => new { Id = g.Key, Cant = g.Count() })
                .ToDictionaryAsync(x => x.Id, x => x.Cant);

            var hoy = DateTime.Today;
            var vm = items.Select(c =>
            {
                var item = MapLista(c);
                item.Vigente = c.FechaVencimiento >= hoy;
                entregasPorContrato.TryGetValue(c.Id, out var ent);
                renovPorContrato.TryGetValue(c.Id, out var ren);
                item.CantidadEntregas = ent;
                item.CantidadRenovaciones = ren;
                item.IdUsuarioRegistra = c.IdUsuarioRegistra;
                item.FechaUsuarioRegistra = c.FechaUsuarioRegistra;
                item.UsuarioRegistra = c.IdUsuarioRegistraNavigation?.Usuario;
                item.IdUsuarioModifica = c.IdUsuarioModifica;
                item.FechaUsuarioModifica = c.FechaUsuarioModifica;
                item.UsuarioModifica = c.IdUsuarioModificaNavigation?.Usuario;
                return item;
            }).ToList();

            return Ok(vm);
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var c = await _service.Obtener(id);
            if (c == null)
                return NotFound();

            return Ok(MapLista(c));
        }

        [HttpGet]
        public async Task<IActionResult> DatosPlantilla(int id)
        {
            var c = await _service.Obtener(id);
            if (c == null)
                return NotFound();

            return Ok(ContratoPlantillaMapper.Map(c));
        }

        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMContratoGuardar model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);
            var entity = MapEntidad(model, idUsuario, esNuevo: true);

            var result = await _service.Insertar(entity);

            return Ok(new
            {
                id = entity.Id,
                valor = result.Ok,
                mensaje = result.Mensaje,
                tipo = result.Tipo,
                idReferencia = result.IdReferencia ?? entity.Id
            });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMContratoGuardar model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);
            var entity = MapEntidad(model, idUsuario, esNuevo: false);

            var result = await _service.Actualizar(entity);

            return Ok(new
            {
                valor = result.Ok,
                mensaje = result.Mensaje,
                tipo = result.Tipo
            });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            var result = await _service.Eliminar(id);
            return Ok(new { valor = result.Ok, mensaje = result.Mensaje, tipo = result.Tipo });
        }

        private static VMContratoLista MapLista(Contrato c)
        {
            var hoy = DateTime.Today;
            return new VMContratoLista
            {
                Id = c.Id,
                IdCliente = c.IdCliente,
                Cliente = c.IdClienteNavigation?.Nombre ?? "",
                IdEstablecimiento = c.IdEstablecimiento,
                IdTipoContrato = c.IdTipoContrato,
                TipoContrato = c.IdTipoContratoNavigation?.Nombre,
                Establecimiento = c.IdEstablecimientoNavigation?.Nombre ?? "",
                IdSucursal = c.IdClienteNavigation?.IdSucursal ?? 0,
                Sucursal = c.IdClienteNavigation?.IdSucursalNavigation?.Nombre,
                FechaContrato = c.FechaContrato,
                FechaInicio = c.FechaInicio,
                FechaVencimiento = c.FechaVencimiento,
                Vigente = c.FechaVencimiento >= hoy,
                Etiqueta = $"#{c.Id} - {c.IdClienteNavigation?.Nombre} / {c.IdEstablecimientoNavigation?.Nombre}"
            };
        }

        private static Contrato MapEntidad(VMContratoGuardar model, int idUsuario, bool esNuevo)
        {
            var entity = new Contrato
            {
                Id = model.Id,
                IdCliente = model.IdCliente,
                IdEstablecimiento = model.IdEstablecimiento,
                IdTipoContrato = model.IdTipoContrato > 0 ? model.IdTipoContrato : null,
                FechaContrato = model.FechaContrato.Date,
                FechaInicio = model.FechaInicio.Date,
                FechaVencimiento = model.FechaVencimiento.Date
            };

            if (esNuevo)
            {
                entity.IdUsuarioRegistra = idUsuario;
                entity.FechaUsuarioRegistra = DateTime.Now;
            }
            else
            {
                entity.IdUsuarioModifica = idUsuario;
                entity.FechaUsuarioModifica = DateTime.Now;
            }

            return entity;
        }

    }
}
