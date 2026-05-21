using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class SucursalesService : ISucursalesService
    {
        private readonly ISucursalesRepository _repo;

        public SucursalesService(ISucursalesRepository repo)
        {
            _repo = repo;
        }

        public Task<bool> Actualizar(Sucursal model) => _repo.Actualizar(model);
        public Task<bool> Eliminar(int id) => _repo.Eliminar(id);
        public Task<bool> Insertar(Sucursal model) => _repo.Insertar(model);
        public Task<Sucursal?> Obtener(int id) => _repo.Obtener(id);
        public Task<IQueryable<Sucursal>> ObtenerTodos() => _repo.ObtenerTodos();
    }
}
