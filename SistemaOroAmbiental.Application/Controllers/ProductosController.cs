using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class ProductosController : Controller
    {
        private readonly IProductosService _service;

        public ProductosController(IProductosService service)
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
            var productos = (await _service.ObtenerTodos()).ToList();
            var stocks = await _service.ObtenerStockTotalesPorProducto();

            var lista = productos.Select(p =>
            {
                var stockTotal = stocks.TryGetValue(p.Id, out var s) ? s : 0m;
                var (codigo, texto) = CalcularEstadoStock(stockTotal, p.StockMinimo);

                return new VMProducto
                {
                    Id = p.Id,
                    Nombre = p.Nombre,
                    IdCategoria = p.IdCategoria,
                    IdMedida = p.IdMedida,
                    CostoUnitario = p.CostoUnitario,
                    StockMinimo = p.StockMinimo,
                    StockTotal = stockTotal,
                    StockEstadoCodigo = codigo,
                    StockEstadoTexto = texto,
                    Categoria = p.IdCategoriaNavigation?.Nombre ?? "",
                    Medida = p.IdMedidaNavigation?.Nombre ?? "",
                    IdUsuarioRegistra = p.IdUsuarioRegistra,
                    FechaUsuarioRegistra = p.FechaUsuarioRegistra,
                    UsuarioRegistra = p.IdUsuarioRegistraNavigation?.Usuario,
                    IdUsuarioModifica = p.IdUsuarioModifica,
                    FechaUsuarioModifica = p.FechaUsuarioModifica,
                    UsuarioModifica = p.IdUsuarioModificaNavigation?.Usuario
                };
            }).ToList();

            return Ok(lista);
        }

        private static (string codigo, string texto) CalcularEstadoStock(decimal stockTotal, int stockMinimo)
        {
            if (stockTotal <= 0)
                return ("sin_stock", "Sin stock");

            if (stockMinimo > 0 && stockTotal < stockMinimo)
                return ("bajo", "Bajo mínimo");

            if (stockMinimo > 0)
                return ("ok", "Stock OK");

            return ("normal", "Disponible");
        }

        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMProducto model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);

            var producto = new Producto
            {
                Nombre = model.Nombre,
                IdCategoria = model.IdCategoria,
                IdMedida = model.IdMedida,
                CostoUnitario = model.CostoUnitario,
                StockMinimo = model.StockMinimo,
                IdUsuarioRegistra = idUsuario,
                FechaUsuarioRegistra = DateTime.Now
            };

            ServiceResult result = await _service.Insertar(producto);

            return Ok(new
            {
                id = producto.Id,
                valor = result.Ok,
                mensaje = result.Mensaje,
                tipo = result.Tipo,
                idReferencia = result.IdReferencia
            });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMProducto model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);

            var producto = new Producto
            {
                Id = model.Id,
                Nombre = model.Nombre,
                IdCategoria = model.IdCategoria,
                IdMedida = model.IdMedida,
                CostoUnitario = model.CostoUnitario,
                StockMinimo = model.StockMinimo,
                IdUsuarioModifica = idUsuario,
                FechaUsuarioModifica = DateTime.Now
            };

            ServiceResult result = await _service.Actualizar(producto);

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
            ServiceResult result = await _service.Eliminar(id);

            return Ok(new
            {
                valor = result.Ok,
                mensaje = result.Mensaje,
                tipo = result.Tipo,
                idReferencia = result.IdReferencia
            });
        }

        [HttpGet]
        public async Task<IActionResult> HistorialCosto(int id)
        {
            var (producto, historial) = await _service.ObtenerHistorialCosto(id);

            if (producto == null)
                return NotFound();

            var items = historial.Select(h => new VMProductoCostoHistorialItem
            {
                Id = h.Id,
                Fecha = h.Fecha,
                CostoAnterior = h.CostoAnterior,
                CostoNuevo = h.CostoNuevo,
                Variacion = h.Variacion,
                PorcentajeVariacion = h.PorcentajeVariacion,
                Origen = h.Origen,
                OrigenTexto = TextoOrigenHistorial(h.Origen, h.IdCompra),
                Tendencia = h.Variacion > 0 ? "subio" : h.Variacion < 0 ? "bajo" : "igual",
                IdCompra = h.IdCompra,
                Usuario = h.Usuario,
                Proveedor = h.Proveedor,
                Detalle = h.Proveedor
            }).ToList();

            return Ok(new VMProductoCostoHistorialResponse
            {
                IdProducto = producto.Id,
                NombreProducto = producto.Nombre,
                CostoActual = producto.CostoUnitario,
                Items = items
            });
        }

        private static string TextoOrigenHistorial(string origen, int? idCompra)
        {
            return origen switch
            {
                "ALTA" => "Alta del producto",
                "MANUAL" => "Edición manual",
                "COMPRA" => idCompra.HasValue ? $"Compra #{idCompra}" : "Compra",
                "REVERSION_COMPRA" => idCompra.HasValue ? $"Anulación compra #{idCompra}" : "Reversión por compra",
                _ => origen
            };
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
                p.IdCategoria,
                p.IdMedida,
                p.CostoUnitario,
                p.StockMinimo,
                p.FechaUsuarioRegistra,
                UsuarioRegistra = p.IdUsuarioRegistraNavigation?.Usuario,
                p.FechaUsuarioModifica,
                UsuarioModifica = p.IdUsuarioModificaNavigation?.Usuario
            });
        }
    }
}
