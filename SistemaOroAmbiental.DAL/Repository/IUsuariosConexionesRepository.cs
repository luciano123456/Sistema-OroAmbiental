using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IUsuariosConexionesRepository
    {
        Task RegistrarAsync(UsuariosConexion evento);
        Task ActualizarUltimaActividadAsync(int idUsuario, DateTime utcNow, bool forzar = false);
        Task<IReadOnlyList<UsuariosConexion>> ListarPorUsuarioAsync(int idUsuario, int take = 100);
        Task<IReadOnlyList<(int Id, DateTime? FechaUltimaActividad)>> ListarPresenciaAsync();
    }
}
