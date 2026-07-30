using System.Globalization;
using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class ProveedoresOperativoRepository : IProveedoresOperativoRepository
    {
        private readonly SistemaOroAmbientalContext _db;

        public ProveedoresOperativoRepository(SistemaOroAmbientalContext context)
        {
            _db = context;
        }

        public async Task<ProveedorControlFiltradoDto?> ObtenerControlMensualFiltrado(
            int idProveedor,
            IReadOnlyList<int> anios,
            IReadOnlyList<int> meses)
        {
            var proveedor = await _db.Proveedores.AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == idProveedor);

            if (proveedor == null)
                return null;

            var aniosNorm = (anios ?? Array.Empty<int>())
                .Where(a => a >= 2000 && a <= 2100)
                .Distinct()
                .OrderByDescending(a => a)
                .ToList();

            var mesesNorm = (meses ?? Array.Empty<int>())
                .Where(m => m is >= 1 and <= 12)
                .Distinct()
                .OrderBy(m => m)
                .ToList();

            if (!aniosNorm.Any())
                aniosNorm.Add(DateTime.Now.Year);
            if (!mesesNorm.Any())
                mesesNorm = Enumerable.Range(1, 12).ToList();

            var datosParciales = false;

            List<Compra> compras = new();
            try
            {
                compras = await _db.Compras.AsNoTracking()
                    .Where(c => c.IdProveedor == idProveedor && aniosNorm.Contains(c.Fecha.Year))
                    .ToListAsync();
            }
            catch
            {
                datosParciales = true;
            }

            List<ProveedoresCuentaCorrienteMovimiento> movimientos = new();
            try
            {
                movimientos = await _db.ProveedoresCuentaCorrienteMovimientos.AsNoTracking()
                    .Include(m => m.IdCuentaCorrienteNavigation)
                    .Where(m =>
                        m.IdCuentaCorrienteNavigation.IdProveedor == idProveedor &&
                        aniosNorm.Contains(m.Fecha.Year))
                    .ToListAsync();
            }
            catch
            {
                datosParciales = true;
            }

            var overrides = new Dictionary<(int Anio, int Mes), ProveedoresControlMensual>();
            try
            {
                var items = await _db.ProveedoresControlMensuales.AsNoTracking()
                    .Where(c =>
                        c.IdProveedor == idProveedor &&
                        aniosNorm.Contains(c.Anio) &&
                        mesesNorm.Contains(c.Mes))
                    .ToListAsync();

                overrides = items.ToDictionary(c => (c.Anio, c.Mes));
            }
            catch
            {
                datosParciales = true;
            }

            decimal saldoActual = 0;
            try
            {
                saldoActual = await _db.ProveedoresCuentaCorrientes.AsNoTracking()
                    .Where(x => x.IdProveedor == idProveedor)
                    .Select(x => x.Saldo)
                    .FirstOrDefaultAsync();
            }
            catch
            {
                datosParciales = true;
            }

            var filas = new List<ProveedorControlMensualDto>();
            decimal totalDebe = 0;
            decimal totalHaber = 0;

            foreach (var anio in aniosNorm)
            {
                foreach (var mes in mesesNorm)
                {
                    var fila = ConstruirFilaControlMensual(anio, mes, compras, movimientos, overrides);
                    totalDebe += fila.Debe;
                    totalHaber += fila.Haber;
                    filas.Add(fila);
                }
            }

            return new ProveedorControlFiltradoDto
            {
                IdProveedor = idProveedor,
                Proveedor = proveedor.Nombre,
                Cuit = proveedor.Cuit,
                SaldoActual = saldoActual,
                TotalDebe = totalDebe,
                TotalHaber = totalHaber,
                TotalSaldo = totalDebe - totalHaber,
                DatosParciales = datosParciales,
                Filas = filas
            };
        }

        private static ProveedorControlMensualDto ConstruirFilaControlMensual(
            int anio,
            int mes,
            List<Compra> compras,
            List<ProveedoresCuentaCorrienteMovimiento> movimientos,
            Dictionary<(int Anio, int Mes), ProveedoresControlMensual> overrides)
        {
            var comprasMes = compras
                .Where(c => c.Fecha.Year == anio && c.Fecha.Month == mes)
                .ToList();

            var movsMes = movimientos
                .Where(m => m.Fecha.Year == anio && m.Fecha.Month == mes)
                .ToList();

            overrides.TryGetValue((anio, mes), out var ov);

            var debe = movsMes.Sum(m => m.Debe);
            var haber = movsMes.Sum(m => m.Haber);
            var pagos = movsMes
                .Where(m => m.TipoMovimiento == ProveedoresCuentaCorrienteRepository.TIPO_PAGO_PROVEEDOR)
                .Sum(m => m.Haber);

            return new ProveedorControlMensualDto
            {
                IdControl = ov?.Id,
                Anio = anio,
                Mes = mes,
                MesNombre = MesNombre(anio, mes),
                CantCompras = comprasMes.Count,
                TotalCompras = comprasMes.Sum(c => c.ImporteTotal),
                TotalPagos = pagos,
                Debe = debe,
                Haber = haber,
                Saldo = debe - haber,
                SinCompra = ov?.SinCompra ?? false,
                Observaciones = ov?.Observaciones,
                TieneOverride = ov != null
            };
        }

        private static string MesNombre(int anio, int mes)
        {
            var culture = new CultureInfo("es-AR");
            var text = new DateTime(anio, mes, 1).ToString("MMMM yyyy", culture);
            return culture.TextInfo.ToTitleCase(text);
        }

        public async Task<bool> GuardarControlMensual(ProveedoresControlMensual model, bool esNuevo, int idUsuario)
        {
            try
            {
                ProveedoresControlMensual entity;

                if (esNuevo)
                {
                    entity = await _db.ProveedoresControlMensuales
                        .FirstOrDefaultAsync(x =>
                            x.IdProveedor == model.IdProveedor &&
                            x.Anio == model.Anio &&
                            x.Mes == model.Mes);

                    if (entity == null)
                    {
                        model.IdUsuarioRegistra = idUsuario;
                        model.FechaUsuarioRegistra = DateTime.Now;
                        _db.ProveedoresControlMensuales.Add(model);
                        await _db.SaveChangesAsync();
                        return true;
                    }

                    esNuevo = false;
                    model.Id = entity.Id;
                }

                entity = await _db.ProveedoresControlMensuales.FirstOrDefaultAsync(x => x.Id == model.Id);
                if (entity == null)
                    return false;

                entity.SinCompra = model.SinCompra;
                entity.Observaciones = model.Observaciones;
                entity.IdUsuarioModifica = idUsuario;
                entity.FechaUsuarioModifica = DateTime.Now;

                await _db.SaveChangesAsync();
                return true;
            }
            catch
            {
                return false;
            }
        }
    }
}
