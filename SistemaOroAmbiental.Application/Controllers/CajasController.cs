using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class CajasController : Controller
    {
        private readonly ICajasService _service;
        private readonly IGastosService _gastosService;

        public CajasController(ICajasService service, IGastosService gastosService)
        {
            _service = service;
            _gastosService = gastosService;
        }

        [AllowAnonymous]
        public IActionResult Index()
        {
            return RedirectToAction("Tesoreria", "Finanzas");
        }

        [HttpPost]
        public async Task<IActionResult> SincronizarGastos()
        {
            try
            {
                var idClaim = User.FindFirst("Id")?.Value;
                if (int.TryParse(idClaim, out var idUsuario) && idUsuario > 0)
                {
                    var n = await _gastosService.SincronizarMovimientosCajaPendientes(idUsuario);
                    return Ok(new { valor = true, sincronizados = n });
                }
            }
            catch
            {
                // ignore
            }

            return Ok(new { valor = true, sincronizados = 0 });
        }

        [HttpPost]
        public async Task<IActionResult> Movimientos([FromBody] VMCajaFiltro filtro)
        {
            filtro ??= new VMCajaFiltro();

            var movimientos = await _service.Movimientos(
                filtro.FechaDesde,
                filtro.FechaHasta,
                filtro.IdCuenta,
                filtro.IdSucursal,
                filtro.TipoMovimiento,
                filtro.Texto,
                filtro.TipoCuenta);

            decimal saldo = await _service.SaldoAnterior(
                filtro.FechaDesde,
                filtro.IdCuenta,
                filtro.IdSucursal,
                filtro.TipoCuenta);

            var lista = new List<VMCajaMovimiento>
            {
                new()
                {
                    Id = 0,
                    Fecha = filtro.FechaDesde ?? DateTime.Today,
                    TipoMovimiento = "SALDO_ANTERIOR",
                    Concepto = "Saldo anterior",
                    Ingreso = 0,
                    Egreso = 0,
                    Saldo = saldo,
                    PuedeEditar = false,
                    PuedeEliminar = false,
                    Origen = ""
                }
            };

            foreach (var m in movimientos)
            {
                saldo += m.Ingreso - m.Egreso;

                var cuenta = m.IdCajaNavigation?.IdCuentaNavigation;
                var puede = m.TipoMovimiento is "INGRESO MANUAL" or "EGRESO MANUAL" or "TRANSFERENCIA";

                lista.Add(new VMCajaMovimiento
                {
                    Id = m.Id,
                    Fecha = m.Fecha,
                    TipoMovimiento = m.TipoMovimiento,
                    IdMovimiento = m.IdMovimiento,
                    Concepto = m.Concepto,
                    IdCaja = m.IdCaja,
                    IdCuenta = cuenta?.Id ?? 0,
                    Cuenta = cuenta?.Nombre,
                    Sucursal = cuenta?.IdSucursalNavigation?.Nombre,
                    Ingreso = m.Ingreso,
                    Egreso = m.Egreso,
                    Saldo = saldo,
                    PuedeEditar = puede,
                    PuedeEliminar = puede,
                    Origen = ObtenerOrigen(m.TipoMovimiento)
                });
            }

            return Ok(lista);
        }

        [HttpPost]
        public async Task<IActionResult> Resumen([FromBody] VMCajaFiltro filtro)
        {
            filtro ??= new VMCajaFiltro();

            var saldoAnterior = await _service.SaldoAnterior(
                filtro.FechaDesde,
                filtro.IdCuenta,
                filtro.IdSucursal,
                filtro.TipoCuenta);

            var (ingresos, egresos, cantidad) = await _service.Resumen(
                filtro.FechaDesde,
                filtro.FechaHasta,
                filtro.IdCuenta,
                filtro.IdSucursal,
                filtro.TipoMovimiento,
                filtro.Texto,
                filtro.TipoCuenta);

            return Ok(new VMCajaResumen
            {
                SaldoAnterior = saldoAnterior,
                Ingresos = ingresos,
                Egresos = egresos,
                SaldoActual = saldoAnterior + ingresos - egresos,
                CantidadMovimientos = cantidad
            });
        }

        [HttpPost]
        public async Task<IActionResult> ResumenConsolidado([FromBody] VMCajaFiltro filtro)
        {
            filtro ??= new VMCajaFiltro();

            var (saldoEfectivo, saldoBanco, ingEfe, egrEfe, ingBan, egrBan) = await _service.ResumenConsolidado(
                filtro.FechaDesde,
                filtro.FechaHasta,
                filtro.IdSucursal,
                filtro.Texto);

            return Ok(new VMCajaResumenConsolidado
            {
                SaldoEfectivo = saldoEfectivo,
                SaldoBanco = saldoBanco,
                SaldoTotal = saldoEfectivo + saldoBanco,
                IngresosEfectivo = ingEfe,
                EgresosEfectivo = egrEfe,
                IngresosBanco = ingBan,
                EgresosBanco = egrBan
            });
        }

        [HttpGet]
        public async Task<IActionResult> Movimiento(int id)
        {
            var (mov, saldo, origen, puedeEditar, puedeEliminar, tipoTransferencia) = await _service.ObtenerMovimiento(id);

            if (mov == null)
                return NotFound();

            var cuenta = mov.IdCajaNavigation?.IdCuentaNavigation;

            return Ok(new VMCajaDetalleMovimiento
            {
                Id = mov.Id,
                Fecha = mov.Fecha,
                TipoMovimiento = mov.TipoMovimiento,
                IdMovimiento = mov.IdMovimiento,
                Concepto = mov.Concepto,
                IdCuenta = cuenta?.Id ?? 0,
                IdSucursal = cuenta?.IdSucursal ?? 0,
                Cuenta = cuenta?.Nombre,
                Sucursal = cuenta?.IdSucursalNavigation?.Nombre,
                Ingreso = mov.Ingreso,
                Egreso = mov.Egreso,
                Saldo = saldo,
                PuedeEditar = puedeEditar,
                PuedeEliminar = puedeEliminar,
                Origen = origen,
                TipoTransferencia = tipoTransferencia
            });
        }

        [HttpGet]
        public async Task<IActionResult> Transferencia(int idMovimientoGrupo)
        {
            var (salida, entrada) = await _service.ObtenerParTransferencia(idMovimientoGrupo);
            if (salida == null || entrada == null)
                return NotFound();

            var nota = ExtraerNotaTransferencia(salida.Concepto);

            var cuentaOrigen = salida.IdCajaNavigation.IdCuentaNavigation;
            var cuentaDestino = entrada.IdCajaNavigation.IdCuentaNavigation;

            return Ok(new VMCajaDetalleTransferencia
            {
                IdMovimientoGrupo = idMovimientoGrupo,
                Fecha = salida.Fecha,
                IdCuentaOrigen = salida.IdCajaNavigation.IdCuenta,
                IdSucursalOrigen = cuentaOrigen?.IdSucursal ?? 0,
                CuentaOrigen = cuentaOrigen?.Nombre,
                ImporteOrigen = salida.Egreso,
                IdCuentaDestino = entrada.IdCajaNavigation.IdCuenta,
                IdSucursalDestino = cuentaDestino?.IdSucursal ?? 0,
                CuentaDestino = cuentaDestino?.Nombre,
                ImporteDestino = entrada.Ingreso,
                NotaInterna = nota,
                PuedeEditar = true,
                PuedeEliminar = true
            });
        }

        [HttpPost]
        public async Task<IActionResult> RegistrarIngreso([FromBody] VMCajaMovimientoManual model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);
            var result = await _service.RegistrarIngresoManual(
                model.Fecha, model.IdCuenta, model.Concepto, model.Importe, idUsuario);

            return Ok(new { valor = result.Ok, mensaje = result.Mensaje, tipo = result.Tipo });
        }

        [HttpPost]
        public async Task<IActionResult> RegistrarEgreso([FromBody] VMCajaMovimientoManual model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);
            var result = await _service.RegistrarEgresoManual(
                model.Fecha, model.IdCuenta, model.Concepto, model.Importe, idUsuario);

            return Ok(new { valor = result.Ok, mensaje = result.Mensaje, tipo = result.Tipo });
        }

        [HttpPost]
        public async Task<IActionResult> ActualizarMovimientoManual([FromBody] VMCajaMovimientoManual model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);
            var result = await _service.ActualizarMovimientoManual(
                model.Id ?? 0, model.Fecha, model.IdCuenta, model.Concepto, model.Importe, idUsuario);

            return Ok(new { valor = result.Ok, mensaje = result.Mensaje, tipo = result.Tipo });
        }

        [HttpPost]
        public async Task<IActionResult> RegistrarTransferencia([FromBody] VMCajaTransferencia model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);
            var result = await _service.RegistrarTransferencia(
                model.Fecha,
                model.IdCuentaOrigen,
                model.IdCuentaDestino,
                model.Importe,
                model.NotaInterna,
                idUsuario);

            return Ok(new { valor = result.Ok, mensaje = result.Mensaje, tipo = result.Tipo });
        }

        [HttpPost]
        public async Task<IActionResult> ActualizarTransferencia([FromBody] VMCajaTransferencia model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);
            var result = await _service.ActualizarTransferencia(
                model.IdMovimientoGrupo ?? model.Id ?? 0,
                model.Fecha,
                model.IdCuentaOrigen,
                model.IdCuentaDestino,
                model.Importe,
                model.NotaInterna,
                idUsuario);

            return Ok(new { valor = result.Ok, mensaje = result.Mensaje, tipo = result.Tipo });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);
            var result = await _service.Eliminar(id, idUsuario);

            return Ok(new { valor = result.Ok, mensaje = result.Mensaje, tipo = result.Tipo });
        }

        private static string ObtenerOrigen(string tipo) => tipo switch
        {
            "INGRESO MANUAL" => "MANUAL",
            "EGRESO MANUAL" => "MANUAL",
            "TRANSFERENCIA" => "TRANSFERENCIA",
            "COBRO CLIENTE" => "CLIENTES",
            "PAGO PROVEEDOR" => "PROVEEDORES",
            "GASTO" => "GASTOS",
            _ => "SISTEMA"
        };

        private static string ExtraerNotaTransferencia(string concepto)
        {
            const string prefijo = "Transferencia salida - ";
            if (concepto.StartsWith(prefijo, StringComparison.OrdinalIgnoreCase))
                return concepto[prefijo.Length..];
            if (concepto.Contains(" - "))
                return concepto[(concepto.IndexOf(" - ", StringComparison.Ordinal) + 3)..];
            return concepto.Replace("Transferencia salida", "").Trim();
        }
    }
}
