using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class TiposPagoService : ITiposPagoService
    {
        private readonly ITiposPagoRepository _repo;

        public TiposPagoService(ITiposPagoRepository repo)
        {
            _repo = repo;
        }

        public Task<bool> Actualizar(TiposPago model) => _repo.Actualizar(model);
        public Task<bool> Eliminar(int id) => _repo.Eliminar(id);
        public Task<bool> Insertar(TiposPago model) => _repo.Insertar(model);
        public Task<TiposPago?> Obtener(int id) => _repo.Obtener(id);
        public Task<IQueryable<TiposPago>> ObtenerTodos() => _repo.ObtenerTodos();
    }
}
