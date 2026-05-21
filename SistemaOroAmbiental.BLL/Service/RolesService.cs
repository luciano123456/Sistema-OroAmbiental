using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class RolesService : IRolesService
    {

        private readonly IRolesRepository<UsuariosRol> _contactRepo;

        public RolesService(IRolesRepository<UsuariosRol> contactRepo)
        {
            _contactRepo = contactRepo;
        }
        public async Task<bool> Actualizar(UsuariosRol model)
        {
            return await _contactRepo.Actualizar(model);
        }

        public async Task<bool> Eliminar(int id)
        {
            return await _contactRepo.Eliminar(id);
        }

        public async Task<bool> Insertar(UsuariosRol model)
        {
            return await _contactRepo.Insertar(model);
        }

        public async Task<UsuariosRol> Obtener(int id)
        {
            return await _contactRepo.Obtener(id);
        }


        public async Task<IQueryable<UsuariosRol>> ObtenerTodos()
        {
            return await _contactRepo.ObtenerTodos();
        }



    }
}
