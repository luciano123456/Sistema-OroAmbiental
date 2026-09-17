using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class EliminacionesLogRepository : IEliminacionesLogRepository
    {
        private readonly SistemaOroAmbientalContext _db;

        public EliminacionesLogRepository(SistemaOroAmbientalContext db)
        {
            _db = db;
        }

        public async Task InsertarAsync(EliminacionLog log)
        {
            await _db.Database.ExecuteSqlInterpolatedAsync($@"
INSERT INTO dbo.EliminacionesLog
    (Fecha, IdUsuario, UsuarioNombre, Entidad, IdEntidad, NombreEntidad, Tipo, Detalle, Ip)
VALUES
    ({log.Fecha}, {log.IdUsuario}, {log.UsuarioNombre}, {log.Entidad}, {log.IdEntidad}, {log.NombreEntidad}, {log.Tipo}, {log.Detalle}, {log.Ip})");
        }

        public Task<List<EliminacionLog>> ListarAsync(int take = 500)
            => _db.EliminacionesLogs
                .AsNoTracking()
                .OrderByDescending(x => x.Fecha)
                .ThenByDescending(x => x.Id)
                .Take(take)
                .ToListAsync();
    }
}
