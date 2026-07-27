using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.DAL.Repository;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class InventarioController : Controller
    {
        private readonly IInventarioService _service;

        public InventarioController(IInventarioService service)
        {
            _service = service;
        }

        [AllowAnonymous]
        public IActionResult Index()
        {
            return View();
        }

        [HttpGet]
        public async Task<IActionResult> ListaProductos(
            int idSucursal,
            string? buscar,
            bool soloBajoMinimo = false,
            int? idCategoria = null)
        {
            if (idSucursal <= 0)
                return BadRequest("Seleccione una sucursal.");

            var data = await _service.ListarProductos(idSucursal, buscar, soloBajoMinimo, idCategoria);

            var lista = data.Select(x => new VMInventarioProductoItem
            {
                IdProducto = x.producto.Id,
                IdInventario = x.inventario?.Id ?? 0,
                Nombre = x.producto.Nombre,
                Categoria = x.producto.IdCategoriaNavigation?.Nombre,
                Medida = x.producto.IdMedidaNavigation?.Nombre,
                Stock = x.inventario?.Stock ?? 0,
                StockRecuperado = x.stockRecuperado,
                StockMinimo = x.producto.StockMinimo,
                BajoMinimo = x.producto.StockMinimo > 0 && (x.inventario?.Stock ?? 0) < x.producto.StockMinimo
            });

            return Ok(lista);
        }

        [HttpGet]
        public async Task<IActionResult> Movimiento(int id)
        {
            var (mov, stock) = await _service.ObtenerMovimiento(id);

            if (mov == null)
                return NotFound();

            var puedeEliminar = mov.TipoMovimiento is InventarioRepository.TIPO_ENTRADA_MANUAL
                or InventarioRepository.TIPO_SALIDA_MANUAL
                or InventarioRepository.TIPO_AJUSTE
                or InventarioRepository.TIPO_TRANSFERENCIA;

            return Ok(new VMInventarioDetalleMovimiento
            {
                Id = mov.Id,
                TipoMovimiento = EtiquetaTipo(mov.TipoMovimiento, mov.Entrada, mov.Salida),
                Origen = ObtenerOrigen(mov.TipoMovimiento),
                Fecha = mov.Fecha,
                Concepto = mov.Concepto,
                Entrada = mov.Entrada,
                Salida = mov.Salida,
                Stock = stock,
                Sucursal = mov.IdInventarioNavigation?.IdSucursalNavigation?.Nombre,
                Producto = mov.IdInventarioNavigation?.IdProductoNavigation?.Nombre,
                PuedeEliminar = puedeEliminar
            });
        }

        [HttpPost]
        public async Task<IActionResult> Movimientos([FromBody] VMInventarioFiltro filtro)
        {
            if (!filtro.IdSucursal.HasValue || !filtro.IdProducto.HasValue)
                return BadRequest("Seleccione sucursal y producto.");

            var idSucursal = filtro.IdSucursal.Value;
            var idProducto = filtro.IdProducto.Value;

            var movimientos = await _service.Movimientos(
                idSucursal,
                idProducto,
                filtro.FechaDesde,
                filtro.FechaHasta,
                filtro.TipoMovimiento,
                filtro.Texto);

            decimal stock = await _service.StockAnterior(idSucursal, idProducto, filtro.FechaDesde);

            var lista = new List<VMInventarioMovimiento>
            {
                new()
                {
                    Id = 0,
                    Fecha = filtro.FechaDesde ?? DateTime.Today,
                    TipoMovimiento = "STOCK_ANTERIOR",
                    Concepto = "Stock anterior",
                    Entrada = 0,
                    Salida = 0,
                    Stock = stock,
                    PuedeEliminar = false,
                    Origen = ""
                }
            };

            foreach (var m in movimientos)
            {
                stock += m.Entrada - m.Salida;

                var puedeEliminar = m.TipoMovimiento is InventarioRepository.TIPO_ENTRADA_MANUAL
                    or InventarioRepository.TIPO_SALIDA_MANUAL
                    or InventarioRepository.TIPO_AJUSTE
                    or InventarioRepository.TIPO_TRANSFERENCIA;

                lista.Add(new VMInventarioMovimiento
                {
                    Id = m.Id,
                    Fecha = m.Fecha,
                    TipoMovimiento = EtiquetaTipo(m.TipoMovimiento, m.Entrada, m.Salida),
                    Concepto = m.Concepto,
                    Entrada = m.Entrada,
                    Salida = m.Salida,
                    Stock = stock,
                    PuedeEliminar = puedeEliminar,
                    Origen = ObtenerOrigen(m.TipoMovimiento),
                    Sucursal = m.IdInventarioNavigation?.IdSucursalNavigation?.Nombre,
                    Producto = m.IdInventarioNavigation?.IdProductoNavigation?.Nombre
                });
            }

            return Ok(lista);
        }

        [HttpPost]
        public async Task<IActionResult> Resumen([FromBody] VMInventarioFiltro filtro)
        {
            if (!filtro.IdSucursal.HasValue || !filtro.IdProducto.HasValue)
                return BadRequest("Seleccione sucursal y producto.");

            var idSucursal = filtro.IdSucursal.Value;
            var idProducto = filtro.IdProducto.Value;

            var stockAnterior = await _service.StockAnterior(idSucursal, idProducto, filtro.FechaDesde);

            var (entradas, salidas, cantidad) = await _service.Resumen(
                idSucursal,
                idProducto,
                filtro.FechaDesde,
                filtro.FechaHasta,
                filtro.TipoMovimiento,
                filtro.Texto);

            var stockActual = await _service.StockActual(idSucursal, idProducto);

            return Ok(new VMInventarioResumen
            {
                StockAnterior = stockAnterior,
                Entradas = entradas,
                Salidas = salidas,
                StockActual = stockActual,
                CantidadMovimientos = cantidad
            });
        }

        [HttpPost]
        public async Task<IActionResult> RegistrarEntrada([FromBody] VMInventarioMovimientoManual model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);
            var result = await _service.RegistrarEntradaManual(
                model.IdSucursal, model.IdProducto, model.Fecha, model.Concepto, model.Cantidad, idUsuario);

            return Ok(new { valor = result.Ok, mensaje = result.Mensaje, tipo = result.Tipo });
        }

        [HttpPost]
        public async Task<IActionResult> RegistrarSalida([FromBody] VMInventarioMovimientoManual model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);
            var result = await _service.RegistrarSalidaManual(
                model.IdSucursal, model.IdProducto, model.Fecha, model.Concepto, model.Cantidad, idUsuario);

            return Ok(new { valor = result.Ok, mensaje = result.Mensaje, tipo = result.Tipo });
        }

        [HttpPost]
        public async Task<IActionResult> RegistrarAjuste([FromBody] VMInventarioAjuste model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);
            var result = await _service.RegistrarAjuste(
                model.IdSucursal,
                model.IdProducto,
                model.Fecha,
                model.Concepto,
                model.Entrada,
                model.Salida,
                idUsuario);

            return Ok(new { valor = result.Ok, mensaje = result.Mensaje, tipo = result.Tipo });
        }

        [HttpPost]
        public async Task<IActionResult> RegistrarTransferencia([FromBody] VMInventarioTransferencia model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);
            var result = await _service.RegistrarTransferencia(
                model.Fecha,
                model.IdSucursalOrigen,
                model.IdProducto,
                model.IdSucursalDestino,
                model.Cantidad,
                model.NotaInterna,
                idUsuario);

            return Ok(new { valor = result.Ok, mensaje = result.Mensaje, tipo = result.Tipo });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            var result = await _service.Eliminar(id);
            return Ok(new { valor = result.Ok, mensaje = result.Mensaje, tipo = result.Tipo });
        }

        private static string EtiquetaTipo(string tipo, decimal entrada, decimal salida) => tipo switch
        {
            InventarioRepository.TIPO_ENTRADA_MANUAL => "Entrada manual",
            InventarioRepository.TIPO_SALIDA_MANUAL => "Salida manual",
            InventarioRepository.TIPO_AJUSTE => "Ajuste",
            InventarioRepository.TIPO_COMPRA => "Compra",
            InventarioRepository.TIPO_ENTREGA => salida > 0 ? "Entrega" : "Entrega (entrada)",
            InventarioRepository.TIPO_TRANSFERENCIA => entrada > 0 ? "Transferencia (entrada)" : "Transferencia (salida)",
            "STOCK_ANTERIOR" => "Stock anterior",
            _ => tipo
        };

        private static string ObtenerOrigen(string tipo) => tipo switch
        {
            InventarioRepository.TIPO_ENTRADA_MANUAL or InventarioRepository.TIPO_SALIDA_MANUAL or InventarioRepository.TIPO_AJUSTE => "MANUAL",
            InventarioRepository.TIPO_TRANSFERENCIA => "TRANSFERENCIA",
            InventarioRepository.TIPO_COMPRA => "COMPRAS",
            InventarioRepository.TIPO_ENTREGA => "ENTREGAS",
            _ => "SISTEMA"
        };
    }
}
