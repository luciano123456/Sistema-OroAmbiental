using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class ClientesEstablecimientosTercerosController : Controller
    {
        private readonly IClientesEstablecimientosTercerosService _service;

        public ClientesEstablecimientosTercerosController(IClientesEstablecimientosTercerosService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> ListaPorEstablecimiento(int idEstablecimiento, bool soloActivos = false)
        {
            var items = await _service.ObtenerPorEstablecimiento(idEstablecimiento, soloActivos);
            return Ok(items.Select(Map).ToList());
        }

        [HttpGet]
        public async Task<IActionResult> ListaPorCliente(int idCliente, bool soloActivos = false)
        {
            var items = await _service.ObtenerPorCliente(idCliente, soloActivos);
            return Ok(items.Select(x =>
            {
                var vm = Map(x);
                vm.EstablecimientoNombre = x.IdEstablecimientoNavigation?.Nombre;
                return vm;
            }).ToList());
        }

        [HttpGet]
        public async Task<IActionResult> Analisis(int idEstablecimiento)
        {
            var rows = await _service.AnalisisPorEstablecimiento(idEstablecimiento);
            return Ok(rows);
        }

        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMClienteEstablecimientoTercero model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);
            var entity = MapToEntity(model);
            entity.IdUsuarioRegistra = idUsuario;
            entity.FechaUsuarioRegistra = DateTime.Now;
            entity.Activo = model.Activo;
            var result = await _service.Insertar(entity);
            return Ok(new
            {
                id = entity.Id,
                valor = result.Ok,
                mensaje = result.Mensaje,
                tipo = result.Tipo,
                idReferencia = result.IdReferencia
            });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMClienteEstablecimientoTercero model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);
            var entity = MapToEntity(model);
            entity.IdUsuarioModifica = idUsuario;
            entity.FechaUsuarioModifica = DateTime.Now;
            var result = await _service.Actualizar(entity);
            return Ok(new
            {
                valor = result.Ok,
                mensaje = result.Mensaje,
                tipo = result.Tipo,
                idReferencia = result.IdReferencia
            });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            var result = await _service.Eliminar(id);
            return Ok(new { valor = result.Ok, mensaje = result.Mensaje, tipo = result.Tipo });
        }

        private static VMClienteEstablecimientoTercero Map(ClientesEstablecimientosTercero x) => new()
        {
            Id = x.Id,
            IdEstablecimiento = x.IdEstablecimiento,
            Nombre = x.Nombre,
            Cuit = x.Cuit,
            Telefono = x.Telefono,
            Email = x.Email,
            Banco = x.Banco,
            CbuAlias = x.CbuAlias,
            Observaciones = x.Observaciones,
            Activo = x.Activo
        };

        private static ClientesEstablecimientosTercero MapToEntity(VMClienteEstablecimientoTercero model) => new()
        {
            Id = model.Id,
            IdEstablecimiento = model.IdEstablecimiento,
            Nombre = model.Nombre?.Trim() ?? "",
            Cuit = NullIfEmpty(model.Cuit),
            Telefono = NullIfEmpty(model.Telefono),
            Email = NullIfEmpty(model.Email),
            Banco = NullIfEmpty(model.Banco),
            CbuAlias = NullIfEmpty(model.CbuAlias),
            Observaciones = NullIfEmpty(model.Observaciones),
            Activo = model.Activo
        };

        private static string? NullIfEmpty(string? v)
        {
            var t = (v ?? "").Trim();
            return t.Length == 0 ? null : t;
        }
    }
}
