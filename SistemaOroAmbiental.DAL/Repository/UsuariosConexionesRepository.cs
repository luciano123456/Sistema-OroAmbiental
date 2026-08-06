using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class UsuariosConexionesRepository : IUsuariosConexionesRepository
    {
        private readonly SistemaOroAmbientalContext _db;

        public UsuariosConexionesRepository(SistemaOroAmbientalContext db)
        {
            _db = db;
        }

        public async Task RegistrarAsync(UsuariosConexion evento)
        {
            _db.UsuariosConexiones.Add(evento);
            await _db.SaveChangesAsync();
        }

        /// <summary>
        /// Update directo (sin cargar entidad). Sin forzar, solo escribe si pasaron ~90s
        /// desde la última actividad (evita writes en cada heartbeat).
        /// </summary>
        public async Task ActualizarUltimaActividadAsync(int idUsuario, DateTime utcNow, bool forzar = false)
        {
            if (forzar)
            {
                await _db.Usuarios
                    .Where(u => u.Id == idUsuario)
                    .ExecuteUpdateAsync(s => s.SetProperty(u => u.FechaUltimaActividad, utcNow));
                return;
            }

            var limite = utcNow.AddSeconds(-90);
            await _db.Usuarios
                .Where(u => u.Id == idUsuario
                    && (u.FechaUltimaActividad == null || u.FechaUltimaActividad < limite))
                .ExecuteUpdateAsync(s => s.SetProperty(u => u.FechaUltimaActividad, utcNow));
        }

        public async Task<IReadOnlyList<UsuariosConexion>> ListarPorUsuarioAsync(int idUsuario, int take = 100)
        {
            take = Math.Clamp(take, 1, 200);
            return await _db.UsuariosConexiones
                .AsNoTracking()
                .Where(x => x.IdUsuario == idUsuario)
                .OrderByDescending(x => x.Fecha)
                .ThenByDescending(x => x.Id)
                .Take(take)
                .ToListAsync();
        }

        public async Task<IReadOnlyList<(int Id, DateTime? FechaUltimaActividad)>> ListarPresenciaAsync()
        {
            var rows = await _db.Usuarios
                .AsNoTracking()
                .Select(u => new { u.Id, u.FechaUltimaActividad })
                .ToListAsync();

            return rows.Select(r => (r.Id, r.FechaUltimaActividad)).ToList();
        }
    }
}
