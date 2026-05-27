using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class ProveedoresController : Controller
    {
        private readonly IProveedoresService _service;

        public ProveedoresController(IProveedoresService service)
        {
            _service = service;
        }

        [AllowAnonymous]
        public IActionResult Index()
        {
            return View();
        }

        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var proveedores = (await _service.ObtenerTodos()).ToList();

            var lista = proveedores.Select(p => new VMProveedor
            {
                Id = p.Id,
                Nombre = p.Nombre,
                Telefono = p.Telefono,
                Email = p.Email,
                IdCondicionIva = p.IdCondicionIva,
                Cuit = p.Cuit,
                IdBanco = p.IdBanco,
                AliasBancario = p.AliasBancario,
                CbuBancario = p.CbuBancario,
                CondicionIva = p.IdCondicionIvaNavigation?.Nombre ?? "",
                Banco = p.IdBancoNavigation?.Nombre ?? "",
                IdUsuarioRegistra = p.IdUsuarioRegistra,
                FechaUsuarioRegistra = p.FechaUsuarioRegistra,
                UsuarioRegistra = p.IdUsuarioRegistraNavigation?.Usuario,
                IdUsuarioModifica = p.IdUsuarioModifica,
                FechaUsuarioModifica = p.FechaUsuarioModifica,
                UsuarioModifica = p.IdUsuarioModificaNavigation?.Usuario
            }).ToList();

            return Ok(lista);
        }

        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMProveedor model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);

            var proveedor = new Proveedore
            {
                Nombre = model.Nombre,
                Telefono = model.Telefono,
                Email = model.Email,
                IdCondicionIva = model.IdCondicionIva,
                Cuit = model.Cuit,
                IdBanco = model.IdBanco,
                AliasBancario = model.AliasBancario,
                CbuBancario = model.CbuBancario,
                IdUsuarioRegistra = idUsuario,
                FechaUsuarioRegistra = DateTime.Now
            };

            ServiceResult result = await _service.Insertar(proveedor);

            return Ok(new
            {
                id = proveedor.Id,
                valor = result.Ok,
                mensaje = result.Mensaje,
                tipo = result.Tipo,
                idReferencia = result.IdReferencia
            });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMProveedor model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);

            var proveedor = new Proveedore
            {
                Id = model.Id,
                Nombre = model.Nombre,
                Telefono = model.Telefono,
                Email = model.Email,
                IdCondicionIva = model.IdCondicionIva,
                Cuit = model.Cuit,
                IdBanco = model.IdBanco,
                AliasBancario = model.AliasBancario,
                CbuBancario = model.CbuBancario,
                IdUsuarioModifica = idUsuario,
                FechaUsuarioModifica = DateTime.Now
            };

            ServiceResult result = await _service.Actualizar(proveedor);

            return Ok(new
            {
                valor = result.Ok,
                mensaje = result.Mensaje,
                tipo = result.Tipo,
                idReferencia = result.IdReferencia
            });
        }

        [HttpGet]
        public async Task<IActionResult> DependenciasEliminar(int id)
        {
            var info = await _service.ObtenerDependenciasEliminar(id);
            return Ok(info);
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id, bool cascada = false)
        {
            ServiceResult result = await _service.Eliminar(id, cascada);

            return Ok(new
            {
                valor = result.Ok,
                mensaje = result.Mensaje,
                tipo = result.Tipo,
                idReferencia = result.IdReferencia,
                dependencias = result.Dependencias?.Items,
                instruccionesPasoAPaso = result.InstruccionesPasoAPaso
            });
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var p = await _service.Obtener(id);

            if (p == null)
                return NotFound();

            return Ok(new
            {
                p.Id,
                p.Nombre,
                p.Telefono,
                p.Email,
                p.IdCondicionIva,
                p.Cuit,
                p.IdBanco,
                p.AliasBancario,
                p.CbuBancario,
                p.FechaUsuarioRegistra,
                UsuarioRegistra = p.IdUsuarioRegistraNavigation?.Usuario,
                p.FechaUsuarioModifica,
                UsuarioModifica = p.IdUsuarioModificaNavigation?.Usuario
            });
        }
    }
}
