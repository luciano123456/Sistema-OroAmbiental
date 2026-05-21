using SistemaOroAmbiental.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IRolesRepository<TEntityModel> where TEntityModel : class
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(UsuariosRol model);
        Task<bool> Insertar(UsuariosRol model);
        Task<UsuariosRol> Obtener(int id);
        Task<IQueryable<UsuariosRol>> ObtenerTodos();
    }
}
