using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IEliminacionesLogRepository
    {
        Task InsertarAsync(EliminacionLog log);
        Task<List<EliminacionLog>> ListarAsync(int take = 500);
    }
}
