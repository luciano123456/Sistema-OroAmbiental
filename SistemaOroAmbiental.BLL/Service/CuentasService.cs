using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class CuentasService : ICuentasService
    {
        private readonly ICuentasRepository _repo;

        public CuentasService(ICuentasRepository repo)
        {
            _repo = repo;
        }

        public Task<bool> Actualizar(Cuenta model) => _repo.Actualizar(model);
        public Task<bool> Eliminar(int id) => _repo.Eliminar(id);
        public Task<bool> Insertar(Cuenta model) => _repo.Insertar(model);
        public Task<Cuenta?> Obtener(int id) => _repo.Obtener(id);
        public Task<IQueryable<Cuenta>> ObtenerTodos() => _repo.ObtenerTodos();
    }
}
