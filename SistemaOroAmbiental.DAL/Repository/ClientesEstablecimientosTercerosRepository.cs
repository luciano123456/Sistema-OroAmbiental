using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class ClientesEstablecimientosTercerosRepository : IClientesEstablecimientosTercerosRepository
    {
        private readonly SistemaOroAmbientalContext _db;

        public ClientesEstablecimientosTercerosRepository(SistemaOroAmbientalContext context)
        {
            _db = context;
        }

        public async Task<List<ClientesEstablecimientosTercero>> ObtenerPorEstablecimiento(int idEstablecimiento, bool soloActivos = false)
        {
            var q = _db.ClientesEstablecimientosTerceros.AsNoTracking()
                .Where(x => x.IdEstablecimiento == idEstablecimiento);
            if (soloActivos) q = q.Where(x => x.Activo);
            return await q.OrderBy(x => x.Nombre).ToListAsync();
        }

        public async Task<List<ClientesEstablecimientosTercero>> ObtenerPorCliente(int idCliente, bool soloActivos = false)
        {
            var q = _db.ClientesEstablecimientosTerceros.AsNoTracking()
                .Include(x => x.IdEstablecimientoNavigation)
                .Where(x => x.IdEstablecimientoNavigation.IdCliente == idCliente);
            if (soloActivos) q = q.Where(x => x.Activo);
            return await q.OrderBy(x => x.IdEstablecimientoNavigation.Nombre).ThenBy(x => x.Nombre).ToListAsync();
        }

        public Task<ClientesEstablecimientosTercero?> Obtener(int id)
            => _db.ClientesEstablecimientosTerceros.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);

        public async Task<ClientesEstablecimientosTercero?> BuscarDuplicado(int? idExcluir, int idEstablecimiento, string nombre)
        {
            var query = _db.ClientesEstablecimientosTerceros.AsNoTracking()
                .Where(x => x.IdEstablecimiento == idEstablecimiento && x.Nombre == nombre);
            if (idExcluir.HasValue)
                query = query.Where(x => x.Id != idExcluir.Value);
            return await query.FirstOrDefaultAsync();
        }

        public Task<int> ContarCobros(int idTercero)
            => _db.ClientesCobros.CountAsync(x => x.IdTercero == idTercero);

        public async Task<List<TerceroPagoAnalisisItem>> AnalisisPorEstablecimiento(int idEstablecimiento)
        {
            var idsTerceros = await _db.ClientesEstablecimientosTerceros
                .AsNoTracking()
                .Where(t => t.IdEstablecimiento == idEstablecimiento)
                .Select(t => t.Id)
                .ToListAsync();

            var cobros = await _db.ClientesCobros
                .AsNoTracking()
                .Include(c => c.IdTerceroNavigation)
                .Include(c => c.IdEntregaNavigation)
                .Where(c =>
                    (c.IdTercero != null && idsTerceros.Contains(c.IdTercero.Value))
                    || (c.IdEntregaNavigation != null && c.IdEntregaNavigation.IdEstablecimiento == idEstablecimiento))
                .ToListAsync();

            var totalGral = cobros.Sum(c => c.Importe);
            if (totalGral <= 0)
                return new List<TerceroPagoAnalisisItem>();

            return cobros
                .GroupBy(c => (c.EsPagoTercero || c.IdTercero != null, c.IdTercero))
                .Select(g =>
                {
                    var terc = g.First().IdTerceroNavigation;
                    var total = g.Sum(x => x.Importe);
                    var esTerc = g.Key.Item1;
                    return new TerceroPagoAnalisisItem
                    {
                        IdTercero = g.Key.IdTercero,
                        Nombre = terc?.Nombre ?? (esTerc ? "Pago de terceros (sin identificar)" : "Cliente"),
                        Cuit = terc?.Cuit,
                        Cantidad = g.Count(),
                        Total = total,
                        Porcentaje = Math.Round(total * 100m / totalGral, 1),
                        UltimaFecha = g.Max(x => x.Fecha)
                    };
                })
                .OrderByDescending(x => x.Total)
                .ToList();
        }

        public async Task<bool> Insertar(ClientesEstablecimientosTercero model)
        {
            _db.ClientesEstablecimientosTerceros.Add(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Actualizar(ClientesEstablecimientosTercero model)
        {
            var entity = await _db.ClientesEstablecimientosTerceros.FirstOrDefaultAsync(x => x.Id == model.Id);
            if (entity == null) return false;

            entity.Nombre = model.Nombre;
            entity.Cuit = model.Cuit;
            entity.Telefono = model.Telefono;
            entity.Email = model.Email;
            entity.Banco = model.Banco;
            entity.CbuAlias = model.CbuAlias;
            entity.Observaciones = model.Observaciones;
            entity.Activo = model.Activo;
            entity.IdUsuarioModifica = model.IdUsuarioModifica;
            entity.FechaUsuarioModifica = model.FechaUsuarioModifica;
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            var model = await _db.ClientesEstablecimientosTerceros.FindAsync(id);
            if (model == null) return false;

            var cobros = await _db.ClientesCobros.Where(c => c.IdTercero == id).ToListAsync();
            foreach (var c in cobros)
                c.IdTercero = null;

            _db.ClientesEstablecimientosTerceros.Remove(model);
            await _db.SaveChangesAsync();
            return true;
        }
    }
}
