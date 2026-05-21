using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class DiasService : IDiasService
    {
        private readonly IDiasRepository _repo;

        public DiasService(IDiasRepository repo)
        {
            _repo = repo;
        }

        public Task<bool> Actualizar(Dia model) => _repo.Actualizar(model);
        public Task<bool> Eliminar(int id) => _repo.Eliminar(id);
        public Task<bool> Insertar(Dia model) => _repo.Insertar(model);
        public Task<Dia?> Obtener(int id) => _repo.Obtener(id);
        public Task<IQueryable<Dia>> ObtenerTodos() => _repo.ObtenerTodos();
    }
}
