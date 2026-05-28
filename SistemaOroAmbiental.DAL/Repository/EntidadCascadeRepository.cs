using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class EntidadCascadeRepository : IEntidadCascadeRepository
    {
        private readonly SistemaOroAmbientalContext _db;
        private readonly IClientesEntregasRepository _entregasRepo;
        private readonly IContratosRepository _contratosRepo;
        private readonly IClientesEstablecimientosRepository _establecimientosRepo;
        private readonly IComprasRepository _comprasRepo;
        private readonly IClientesRepository _clientesRepo;
        private readonly IProveedoresRepository _proveedoresRepo;
        private readonly IProveedoresCuentaCorrienteRepository _provCcRepo;
        private readonly IClientesCuentaCorrienteRepository _cliCcRepo;

        public EntidadCascadeRepository(
            SistemaOroAmbientalContext db,
            IClientesEntregasRepository entregasRepo,
            IContratosRepository contratosRepo,
            IClientesEstablecimientosRepository establecimientosRepo,
            IComprasRepository comprasRepo,
            IClientesRepository clientesRepo,
            IProveedoresRepository proveedoresRepo,
            IProveedoresCuentaCorrienteRepository provCcRepo,
            IClientesCuentaCorrienteRepository cliCcRepo)
        {
            _db = db;
            _entregasRepo = entregasRepo;
            _contratosRepo = contratosRepo;
            _establecimientosRepo = establecimientosRepo;
            _comprasRepo = comprasRepo;
            _clientesRepo = clientesRepo;
            _proveedoresRepo = proveedoresRepo;
            _provCcRepo = provCcRepo;
            _cliCcRepo = cliCcRepo;
        }

        public async Task<DependenciasEliminacionInfo> ObtenerDependenciasClienteAsync(int idCliente)
        {
            var items = new List<DependenciaEliminacionItem>();

            var est = await _db.ClientesEstablecimientos.CountAsync(x => x.IdCliente == idCliente);
            if (est > 0)
                items.Add(Item("establecimientos", "Establecimientos", est, "Eliminá cada establecimiento desde Clientes → Establecimientos."));

            var cont = await _db.ClientesContactos.CountAsync(x => x.IdCliente == idCliente);
            if (cont > 0)
                items.Add(Item("contactos", "Contactos del cliente", cont, "Abrí el cliente y quitá los contactos en la pestaña Contactos."));

            var contr = await _db.Contratos.CountAsync(x => x.IdCliente == idCliente);
            if (contr > 0)
                items.Add(Item("contratos", "Contratos", contr, "Eliminá los contratos desde el módulo Contratos."));

            var ent = await _db.ClientesEntregas.CountAsync(e =>
                _db.Contratos.Any(c => c.Id == e.IdContrato && c.IdCliente == idCliente));
            if (ent > 0)
                items.Add(Item("entregas", "Entregas", ent, "Eliminá las entregas vinculadas a los contratos del cliente."));

            var docs = await _db.ContratosDocumentos.CountAsync(d =>
                _db.Contratos.Any(c => c.Id == d.IdContrato && c.IdCliente == idCliente));
            if (docs > 0)
                items.Add(Item("documentos", "Documentos de contratos", docs, "Eliminá los archivos desde cada contrato."));

            var movCc = await ContarMovimientosCcClienteAsync(idCliente);
            if (movCc > 0)
                items.Add(Item("cuentaCorriente", "Movimientos en cuenta corriente", movCc, "Eliminá cobros, ajustes y saldá entregas desde Cuenta corriente del cliente."));

            var cobros = await _db.ClientesCobros.CountAsync(x => x.IdCliente == idCliente);
            if (cobros > 0)
                items.Add(Item("cobros", "Cobros registrados", cobros, "Eliminá los cobros desde la cuenta corriente del cliente."));

            return ArmarInfo("este cliente", items);
        }

        public async Task<DependenciasEliminacionInfo> ObtenerDependenciasProveedorAsync(int idProveedor)
        {
            var items = new List<DependenciaEliminacionItem>();

            var cont = await _db.ProveedoresContactos.CountAsync(x => x.IdProveedor == idProveedor);
            if (cont > 0)
                items.Add(Item("contactos", "Contactos del proveedor", cont, "Abrí el proveedor y quitá los contactos en la pestaña Contactos."));

            var compras = await _db.Compras.CountAsync(x => x.IdProveedor == idProveedor);
            if (compras > 0)
                items.Add(Item("compras", "Compras", compras, "Eliminá cada compra desde el módulo Compras."));

            var pagos = await _db.ProveedoresPagos.CountAsync(x => x.IdProveedor == idProveedor);
            if (pagos > 0)
                items.Add(Item("pagos", "Pagos al proveedor", pagos, "Se eliminan al borrar las compras o desde Cuenta corriente del proveedor."));

            var movCc = await ContarMovimientosCcProveedorAsync(idProveedor);
            if (movCc > 0)
            {
                items.Add(Item("cuentaCorriente", "Movimientos en cuenta corriente", movCc,
                    "Eliminá pagos y ajustes desde Cuenta corriente del proveedor, o usá eliminar en cascada."));
            }
            else
            {
                var tieneCc = await _db.ProveedoresCuentaCorrientes.AnyAsync(x => x.IdProveedor == idProveedor);
                if (tieneCc)
                {
                    items.Add(Item("cuentaCorriente", "Cuenta corriente del proveedor", 1,
                        "La cuenta corriente se creó al registrar pagos o ajustes; podés eliminarla en cascada."));
                }
            }

            return ArmarInfo("este proveedor", items);
        }

        public async Task EliminarClienteEnCascadaAsync(int idCliente)
        {
            var idsContratos = await _db.Contratos
                .Where(c => c.IdCliente == idCliente)
                .Select(c => c.Id)
                .ToListAsync();

            var idsEntregas = await _db.ClientesEntregas
                .Where(e => e.IdCliente == idCliente || (e.IdContrato.HasValue && idsContratos.Contains(e.IdContrato.Value)))
                .Select(e => e.Id)
                .ToListAsync();

            foreach (var idEntrega in idsEntregas)
            {
                if (!await _entregasRepo.Eliminar(idEntrega))
                    throw new InvalidOperationException($"No se pudo eliminar la entrega #{idEntrega}.");
            }

            foreach (var idContrato in idsContratos)
            {
                var docs = await _db.ContratosDocumentos
                    .Where(d => d.IdContrato == idContrato)
                    .Select(d => d.Id)
                    .ToListAsync();

                foreach (var idDoc in docs)
                {
                    var doc = await _db.ContratosDocumentos.FindAsync(idDoc);
                    if (doc != null)
                        _db.ContratosDocumentos.Remove(doc);
                }

                var renov = await _db.ContratosRenovaciones
                    .Where(r => r.IdContrato == idContrato)
                    .ToListAsync();
                _db.ContratosRenovaciones.RemoveRange(renov);

                if (!await _contratosRepo.Eliminar(idContrato))
                    throw new InvalidOperationException($"No se pudo eliminar el contrato #{idContrato}.");
            }

            var idsEst = await _db.ClientesEstablecimientos
                .Where(x => x.IdCliente == idCliente)
                .Select(x => x.Id)
                .ToListAsync();

            foreach (var idEst in idsEst)
            {
                if (!await _establecimientosRepo.Eliminar(idEst))
                    throw new InvalidOperationException($"No se pudo eliminar el establecimiento #{idEst}.");
            }

            var contactos = await _db.ClientesContactos.Where(x => x.IdCliente == idCliente).ToListAsync();
            _db.ClientesContactos.RemoveRange(contactos);

            await EliminarCuentaCorrienteClienteAsync(idCliente);
            await _db.SaveChangesAsync();

            if (!await _clientesRepo.Eliminar(idCliente))
                throw new InvalidOperationException("No se encontró el cliente al finalizar la cascada.");
        }

        public async Task EliminarProveedorEnCascadaAsync(int idProveedor)
        {
            await using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                var idsCompras = await _db.Compras
                    .Where(x => x.IdProveedor == idProveedor)
                    .Select(x => x.Id)
                    .ToListAsync();

                foreach (var idCompra in idsCompras)
                {
                    if (!await _comprasRepo.Eliminar(idCompra))
                        throw new InvalidOperationException($"No se pudo eliminar la compra #{idCompra}.");
                }

                var contactos = await _db.ProveedoresContactos
                    .Where(x => x.IdProveedor == idProveedor)
                    .ToListAsync();
                _db.ProveedoresContactos.RemoveRange(contactos);

                await EliminarCuentaCorrienteProveedorAsync(idProveedor);
                await _db.SaveChangesAsync();

                if (!await _proveedoresRepo.Eliminar(idProveedor))
                    throw new InvalidOperationException("No se encontró el proveedor al finalizar la cascada.");

                await trx.CommitAsync();
            }
            catch
            {
                await trx.RollbackAsync();
                throw;
            }
        }

        private async Task EliminarCuentaCorrienteClienteAsync(int idCliente)
        {
            var cc = await _db.ClientesCuentaCorrientes.FirstOrDefaultAsync(x => x.IdCliente == idCliente);
            if (cc == null) return;

            var movIds = await _db.ClientesCuentaCorrienteMovimientos
                .Where(m => m.IdCuentaCorriente == cc.Id)
                .Select(m => m.Id)
                .ToListAsync();

            foreach (var idMov in movIds)
            {
                var mov = await _db.ClientesCuentaCorrienteMovimientos
                    .Include(m => m.IdCuentaCorrienteNavigation)
                    .FirstOrDefaultAsync(m => m.Id == idMov);

                if (mov == null) continue;

                if (mov.TipoMovimiento == ClientesCuentaCorrienteRepository.TIPO_ENTREGA)
                {
                    cc.Saldo -= (mov.Debe - mov.Haber);
                    _db.ClientesCuentaCorrienteMovimientos.Remove(mov);
                    continue;
                }

                if (!await _cliCcRepo.EliminarSinTransaccion(idMov))
                {
                    throw new InvalidOperationException(
                        $"No se pudo eliminar el movimiento de cuenta corriente #{idMov} ({mov.TipoMovimiento}).");
                }
            }

            var cobrosSueltos = await _db.ClientesCobros.Where(x => x.IdCliente == idCliente).ToListAsync();
            foreach (var cobro in cobrosSueltos)
            {
                if (cobro.IdMovCaja.HasValue)
                {
                    var cajaMov = await _db.CajasMovimientos
                        .Include(x => x.IdCajaNavigation)
                        .FirstOrDefaultAsync(x => x.Id == cobro.IdMovCaja.Value);
                    if (cajaMov != null)
                    {
                        cajaMov.IdCajaNavigation.Saldo -= (cajaMov.Ingreso - cajaMov.Egreso);
                        _db.CajasMovimientos.Remove(cajaMov);
                    }
                }
                _db.ClientesCobros.Remove(cobro);
            }

            _db.ClientesCuentaCorrientes.Remove(cc);
        }

        private async Task EliminarCuentaCorrienteProveedorAsync(int idProveedor)
        {
            var cc = await _db.ProveedoresCuentaCorrientes.FirstOrDefaultAsync(x => x.IdProveedor == idProveedor);
            if (cc == null) return;

            var movimientos = await _db.ProveedoresCuentaCorrienteMovimientos
                .Where(m => m.IdCuentaCorriente == cc.Id)
                .ToListAsync();

            foreach (var mov in movimientos)
            {
                if (mov.TipoMovimiento == ProveedoresCuentaCorrienteRepository.TIPO_COMPRA)
                {
                    cc.Saldo -= (mov.Debe - mov.Haber);
                    _db.ProveedoresCuentaCorrienteMovimientos.Remove(mov);
                    continue;
                }

                if (mov.TipoMovimiento == ProveedoresCuentaCorrienteRepository.TIPO_PAGO_PROVEEDOR)
                {
                    await EliminarPagoProveedorCcAsync(mov, cc);
                    continue;
                }

                if (mov.TipoMovimiento == ProveedoresCuentaCorrienteRepository.TIPO_AJUSTE_PROVEEDOR)
                {
                    await EliminarAjusteProveedorCcAsync(mov, cc);
                    continue;
                }

                cc.Saldo -= (mov.Debe - mov.Haber);
                _db.ProveedoresCuentaCorrienteMovimientos.Remove(mov);
            }

            var pagosSueltos = await _db.ProveedoresPagos.Where(x => x.IdProveedor == idProveedor).ToListAsync();
            foreach (var pago in pagosSueltos)
                await EliminarPagoProveedorRegistroAsync(pago);

            _db.ProveedoresCuentaCorrientes.Remove(cc);
        }

        private async Task EliminarPagoProveedorCcAsync(ProveedoresCuentaCorrienteMovimiento mov, ProveedoresCuentaCorriente cc)
        {
            var pago = await _db.ProveedoresPagos.FirstOrDefaultAsync(x => x.Id == mov.IdMovimiento);
            if (pago != null)
                await EliminarPagoProveedorRegistroAsync(pago);

            cc.Saldo -= (mov.Debe - mov.Haber);
            _db.ProveedoresCuentaCorrienteMovimientos.Remove(mov);
        }

        private async Task EliminarAjusteProveedorCcAsync(ProveedoresCuentaCorrienteMovimiento mov, ProveedoresCuentaCorriente cc)
        {
            var cajaMov = await _db.CajasMovimientos
                .Include(x => x.IdCajaNavigation)
                .FirstOrDefaultAsync(x =>
                    x.TipoMovimiento == ProveedoresCuentaCorrienteRepository.TIPO_AJUSTE_PROVEEDOR &&
                    x.IdMovimiento == mov.Id);

            if (cajaMov != null)
            {
                cajaMov.IdCajaNavigation.Saldo -= (cajaMov.Ingreso - cajaMov.Egreso);
                _db.CajasMovimientos.Remove(cajaMov);
            }

            cc.Saldo -= (mov.Debe - mov.Haber);
            _db.ProveedoresCuentaCorrienteMovimientos.Remove(mov);
        }

        private async Task EliminarPagoProveedorRegistroAsync(ProveedoresPago pago)
        {
            if (pago.IdMovCaja.HasValue)
            {
                var cajaMov = await _db.CajasMovimientos
                    .Include(x => x.IdCajaNavigation)
                    .FirstOrDefaultAsync(x => x.Id == pago.IdMovCaja.Value);

                if (cajaMov != null)
                {
                    cajaMov.IdCajaNavigation.Saldo -= (cajaMov.Ingreso - cajaMov.Egreso);
                    _db.CajasMovimientos.Remove(cajaMov);
                }
            }

            _db.ProveedoresPagos.Remove(pago);
        }

        private async Task<int> ContarMovimientosCcClienteAsync(int idCliente)
        {
            var cc = await _db.ClientesCuentaCorrientes.AsNoTracking()
                .FirstOrDefaultAsync(x => x.IdCliente == idCliente);
            if (cc == null) return 0;

            return await _db.ClientesCuentaCorrienteMovimientos.CountAsync(m => m.IdCuentaCorriente == cc.Id);
        }

        private Task<int> ContarMovimientosCcProveedorAsync(int idProveedor)
            => _db.ProveedoresCuentaCorrienteMovimientos
                .CountAsync(m => m.IdCuentaCorrienteNavigation.IdProveedor == idProveedor);

        private static DependenciaEliminacionItem Item(string clave, string etiqueta, int cantidad, string accionManual)
            => new()
            {
                Clave = clave,
                Etiqueta = etiqueta,
                Cantidad = cantidad,
                AccionManual = accionManual
            };

        private static DependenciasEliminacionInfo ArmarInfo(string entidad, List<DependenciaEliminacionItem> items)
        {
            if (items.Count == 0)
                return new DependenciasEliminacionInfo();

            var partes = items.Select(i => $"{i.Cantidad} {i.Etiqueta.ToLower()}");
            var pasos = string.Join("\n", items.Select((i, n) => $"{n + 1}. {i.AccionManual}"));

            return new DependenciasEliminacionInfo
            {
                Items = items,
                MensajeResumen = $"No se puede eliminar {entidad} porque tiene: {string.Join(", ", partes)}.",
                InstruccionesPasoAPaso = $"Podés eliminar {entidad} paso a paso:\n" + pasos
            };
        }
    }
}
