using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class LibroDiarioRepository : ILibroDiarioRepository
    {
        private readonly SistemaOroAmbientalContext _db;

        public LibroDiarioRepository(SistemaOroAmbientalContext context)
        {
            _db = context;
        }

        public async Task<List<LibroDiarioConcepto>> ListarConceptos(bool soloActivos)
        {
            var q = _db.LibroDiarioConceptos.AsNoTracking().AsQueryable();

            if (soloActivos)
                q = q.Where(x => x.Activo);

            return await q
                .OrderBy(x => x.Nombre)
                .ToListAsync();
        }

        private IQueryable<LibroDiarioMovimiento> QueryBase(LibroDiarioFiltroDto filtro, bool aplicarRangoFechas = true)
        {
            filtro ??= new LibroDiarioFiltroDto();

            var q = _db.LibroDiarioMovimientos
                .AsNoTracking()
                .Include(x => x.IdClienteNavigation)
                .Include(x => x.IdProveedorNavigation)
                .AsQueryable();

            if (filtro.EsBancario.HasValue)
                q = q.Where(x => x.EsBancario == filtro.EsBancario.Value);

            if (filtro.IdCliente.HasValue && filtro.IdCliente > 0)
                q = q.Where(x => x.IdCliente == filtro.IdCliente);

            if (filtro.IdCamion.HasValue && filtro.IdCamion > 0)
                q = q.Where(x => x.IdCamion == filtro.IdCamion);

            if (filtro.IdSemana.HasValue && filtro.IdSemana > 0)
                q = q.Where(x => x.IdSemana == filtro.IdSemana);

            if (filtro.IdDia.HasValue && filtro.IdDia > 0)
                q = q.Where(x => x.IdDia == filtro.IdDia);

            if (!string.IsNullOrWhiteSpace(filtro.Texto))
            {
                var t = filtro.Texto.Trim();
                q = q.Where(x =>
                    x.Concepto.Contains(t) ||
                    (x.RecorridoTexto != null && x.RecorridoTexto.Contains(t)) ||
                    (x.IdClienteNavigation != null && x.IdClienteNavigation.Nombre.Contains(t)) ||
                    (x.IdProveedorNavigation != null && x.IdProveedorNavigation.Nombre.Contains(t)));
            }

            if (aplicarRangoFechas)
            {
                if (filtro.FechaDesde.HasValue)
                    q = q.Where(x => x.Fecha >= filtro.FechaDesde.Value.Date);

                if (filtro.FechaHasta.HasValue)
                {
                    var hasta = filtro.FechaHasta.Value.Date.AddDays(1).AddTicks(-1);
                    q = q.Where(x => x.Fecha <= hasta);
                }
            }

            return q;
        }

        public async Task<decimal> SaldoAnterior(LibroDiarioFiltroDto filtro)
        {
            filtro ??= new LibroDiarioFiltroDto();

            if (!filtro.FechaDesde.HasValue)
                return 0;

            var q = QueryBase(filtro, aplicarRangoFechas: false)
                .Where(x => x.Fecha < filtro.FechaDesde.Value.Date);

            return await q.SumAsync(x => x.Debe - x.Haber);
        }

        public async Task<List<LibroDiarioMovimientoDto>> ListarMovimientos(LibroDiarioFiltroDto filtro)
        {
            filtro ??= new LibroDiarioFiltroDto();

            var saldo = await SaldoAnterior(filtro);
            var movs = await QueryBase(filtro)
                .OrderBy(x => x.Fecha)
                .ThenBy(x => x.Id)
                .ToListAsync();

            var lista = new List<LibroDiarioMovimientoDto>();

            if (filtro.FechaDesde.HasValue)
            {
                lista.Add(new LibroDiarioMovimientoDto
                {
                    Id = 0,
                    Fecha = filtro.FechaDesde.Value.Date,
                    Concepto = "Saldo anterior",
                    Saldo = saldo,
                    EsBancario = filtro.EsBancario ?? false
                });
            }

            foreach (var m in movs)
            {
                saldo += m.Debe - m.Haber;

                lista.Add(new LibroDiarioMovimientoDto
                {
                    Id = m.Id,
                    Fecha = m.Fecha,
                    IdConcepto = m.IdConcepto,
                    Concepto = m.Concepto,
                    IdCliente = m.IdCliente,
                    Cliente = m.IdClienteNavigation?.Nombre,
                    IdProveedor = m.IdProveedor,
                    Proveedor = m.IdProveedorNavigation?.Nombre,
                    RecorridoTexto = m.RecorridoTexto,
                    Unidades = m.Unidades,
                    PrecioUnitario = m.PrecioUnitario,
                    Debe = m.Debe,
                    Haber = m.Haber,
                    PorcIva = m.PorcIva,
                    Iva = m.Iva,
                    OtrosImp = m.OtrosImp,
                    Total = m.Total,
                    Saldo = saldo,
                    FormaPago = m.FormaPago,
                    EsBancario = m.EsBancario
                });
            }

            return lista;
        }

        public async Task<LibroDiarioResumenDto> ObtenerResumen(LibroDiarioFiltroDto filtro)
        {
            filtro ??= new LibroDiarioFiltroDto();

            var saldoAnterior = await SaldoAnterior(filtro);
            var q = QueryBase(filtro);

            var totalDebe = await q.SumAsync(x => x.Debe);
            var totalHaber = await q.SumAsync(x => x.Haber);
            var cantidad = await q.CountAsync();

            return new LibroDiarioResumenDto
            {
                TotalDebe = totalDebe,
                TotalHaber = totalHaber,
                SaldoFinal = saldoAnterior + totalDebe - totalHaber,
                CantidadMovimientos = cantidad
            };
        }

        public async Task<LibroDiarioMovimiento?> ObtenerMovimiento(int id)
            => await _db.LibroDiarioMovimientos
                .Include(x => x.IdClienteNavigation)
                .Include(x => x.IdProveedorNavigation)
                .FirstOrDefaultAsync(x => x.Id == id);

        public async Task<int> InsertarMovimiento(LibroDiarioMovimiento movimiento)
        {
            _db.LibroDiarioMovimientos.Add(movimiento);
            await _db.SaveChangesAsync();
            await RecalcularSaldos(movimiento.EsBancario);
            return movimiento.Id;
        }

        public async Task<bool> ActualizarMovimiento(LibroDiarioMovimiento movimiento)
        {
            var existente = await _db.LibroDiarioMovimientos.FirstOrDefaultAsync(x => x.Id == movimiento.Id);
            if (existente == null)
                return false;

            var esBancarioAnterior = existente.EsBancario;

            existente.Fecha = movimiento.Fecha;
            existente.IdConcepto = movimiento.IdConcepto;
            existente.Concepto = movimiento.Concepto;
            existente.IdCliente = movimiento.IdCliente;
            existente.IdProveedor = movimiento.IdProveedor;
            existente.RecorridoTexto = movimiento.RecorridoTexto;
            existente.IdCamion = movimiento.IdCamion;
            existente.IdSemana = movimiento.IdSemana;
            existente.IdDia = movimiento.IdDia;
            existente.Unidades = movimiento.Unidades;
            existente.PrecioUnitario = movimiento.PrecioUnitario;
            existente.Debe = movimiento.Debe;
            existente.Haber = movimiento.Haber;
            existente.PorcIva = movimiento.PorcIva;
            existente.Iva = movimiento.Iva;
            existente.OtrosImp = movimiento.OtrosImp;
            existente.Total = movimiento.Total;
            existente.FormaPago = movimiento.FormaPago;
            existente.EsBancario = movimiento.EsBancario;
            existente.IdProducto = movimiento.IdProducto;
            existente.TipoStock = movimiento.TipoStock;
            existente.IdUsuarioModifica = movimiento.IdUsuarioModifica;
            existente.FechaUsuarioModifica = movimiento.FechaUsuarioModifica;

            await _db.SaveChangesAsync();

            await RecalcularSaldos(esBancarioAnterior);
            if (esBancarioAnterior != movimiento.EsBancario)
                await RecalcularSaldos(movimiento.EsBancario);

            return true;
        }

        public async Task<bool> EliminarMovimiento(int id)
        {
            var mov = await _db.LibroDiarioMovimientos.FirstOrDefaultAsync(x => x.Id == id);
            if (mov == null)
                return false;

            var esBancario = mov.EsBancario;
            _db.LibroDiarioMovimientos.Remove(mov);
            await _db.SaveChangesAsync();
            await RecalcularSaldos(esBancario);
            return true;
        }

        public async Task<List<(int Id, string Nombre)>> AutocompleteClientes(string? buscar)
        {
            var q = _db.Clientes.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(buscar))
            {
                var t = buscar.Trim();
                q = q.Where(x => x.Nombre.Contains(t));
            }

            return await q
                .OrderBy(x => x.Nombre)
                .Take(20)
                .Select(x => new ValueTuple<int, string>(x.Id, x.Nombre))
                .ToListAsync();
        }

        public async Task<List<(int Id, string Nombre)>> AutocompleteProveedores(string? buscar)
        {
            var q = _db.Proveedores.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(buscar))
            {
                var t = buscar.Trim();
                q = q.Where(x => x.Nombre.Contains(t));
            }

            return await q
                .OrderBy(x => x.Nombre)
                .Take(20)
                .Select(x => new ValueTuple<int, string>(x.Id, x.Nombre))
                .ToListAsync();
        }

        private async Task RecalcularSaldos(bool esBancario)
        {
            var movs = await _db.LibroDiarioMovimientos
                .Where(x => x.EsBancario == esBancario)
                .OrderBy(x => x.Fecha)
                .ThenBy(x => x.Id)
                .ToListAsync();

            decimal saldo = 0;
            foreach (var m in movs)
            {
                saldo += m.Debe - m.Haber;
                m.Saldo = saldo;
            }

            await _db.SaveChangesAsync();
        }
    }
}
