using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class EstadosUsuariosService : IEstadosUsuariosService
    {

        private readonly IEstadosUsuariosRepository<UsuariosEstado> _contactRepo;

        public EstadosUsuariosService(IEstadosUsuariosRepository<UsuariosEstado> contactRepo)
        {
            _contactRepo = contactRepo;
        }
        public async Task<bool> Actualizar(UsuariosEstado model)
        {
            return await _contactRepo.Actualizar(model);
        }

        public async Task<bool> Eliminar(int id)
        {
            return await _contactRepo.Eliminar(id);
        }

        public async Task<bool> Insertar(UsuariosEstado model)
        {
            return await _contactRepo.Insertar(model);
        }

        public async Task<UsuariosEstado> Obtener(int id)
        {
            return await _contactRepo.Obtener(id);
        }


        public async Task<IQueryable<UsuariosEstado>> ObtenerTodos()
        {
            return await _contactRepo.ObtenerTodos();
        }



    }
}
