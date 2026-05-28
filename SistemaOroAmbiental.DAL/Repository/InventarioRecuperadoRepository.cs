using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class InventarioRecuperadoRepository : IInventarioRecuperadoRepository
    {
        public const string TIPO_ENTREGA = "ENTREGA";
        public const string TIPO_MANUAL = "MANUAL";

        private readonly SistemaOroAmbientalContext _db;

        public InventarioRecuperadoRepository(SistemaOroAmbientalContext context)
        {
            _db = context;
        }

        public async Task<InventarioRecuperado> ObtenerOCrear(int idSucursal, int idProducto)
        {
            var inv = await _db.InventarioRecuperados
                .FirstOrDefaultAsync(x => x.IdSucursal == idSucursal && x.IdProducto == idProducto);

            if (inv != null)
                return inv;

            inv = new InventarioRecuperado
            {
                IdSucursal = idSucursal,
                IdProducto = idProducto,
                Stock = 0
            };

            _db.InventarioRecuperados.Add(inv);
            await _db.SaveChangesAsync();
            return inv;
        }

        public async Task RegistrarEntrada(
            int idSucursal,
            int idProducto,
            decimal cantidad,
            DateTime fecha,
            string concepto,
            string tipoMovimiento,
            int idMovimiento,
            int idUsuario)
        {
            if (cantidad <= 0)
                throw new InvalidOperationException("La cantidad debe ser mayor a cero.");

            var inv = await ObtenerOCrear(idSucursal, idProducto);
            var ahora = DateTime.Now;

            var mov = new InventarioRecuperadoMovimiento
            {
                IdInventarioRecuperado = inv.Id,
                TipoMovimiento = tipoMovimiento,
                IdMovimiento = idMovimiento,
                Fecha = fecha == default ? ahora : fecha,
                Concepto = concepto,
                Entrada = cantidad,
                Salida = 0,
                IdUsuarioRegistra = idUsuario,
                FechaUsuarioRegistra = ahora
            };

            _db.InventarioRecuperadoMovimientos.Add(mov);
            inv.Stock += cantidad;
            await _db.SaveChangesAsync();
        }

        public async Task RevertirMovimientosEntrega(int idEntrega)
        {
            var movs = await _db.InventarioRecuperadoMovimientos
                .Include(x => x.IdInventarioRecuperadoNavigation)
                .Where(x =>
                    x.IdMovimiento == idEntrega &&
                    x.TipoMovimiento == TIPO_ENTREGA)
                .ToListAsync();

            foreach (var mov in movs)
            {
                var inv = mov.IdInventarioRecuperadoNavigation;
                inv.Stock -= mov.Entrada;
                if (inv.Stock < 0) inv.Stock = 0;
                _db.InventarioRecuperadoMovimientos.Remove(mov);
            }

            if (movs.Count > 0)
                await _db.SaveChangesAsync();
        }

        public async Task EliminarMovimientoManual(int idMovimiento)
        {
            if (idMovimiento <= 0)
                throw new InvalidOperationException("Movimiento inválido.");

            var mov = await _db.InventarioRecuperadoMovimientos
                .Include(x => x.IdInventarioRecuperadoNavigation)
                .FirstOrDefaultAsync(x => x.Id == idMovimiento);

            if (mov == null)
                throw new InvalidOperationException("No se encontró el movimiento.");

            if (mov.TipoMovimiento != TIPO_MANUAL)
                throw new InvalidOperationException("Solo se pueden eliminar recuperaciones registradas manualmente.");

            var inv = mov.IdInventarioRecuperadoNavigation;
            inv.Stock -= mov.Entrada;
            if (inv.Stock < 0) inv.Stock = 0;

            _db.InventarioRecuperadoMovimientos.Remove(mov);
            await _db.SaveChangesAsync();
        }
    }
}
