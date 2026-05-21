using SistemaOroAmbiental.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IEstadosUsuariosRepository<TEntityModel> where TEntityModel : class
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(UsuariosEstado model);
        Task<bool> Insertar(UsuariosEstado model);
        Task<UsuariosEstado> Obtener(int id);
        Task<IQueryable<UsuariosEstado>> ObtenerTodos();
    }
}
