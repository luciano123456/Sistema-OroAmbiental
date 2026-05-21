using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;
using System;
using System.Collections.Generic;
using System.Diagnostics.Contracts;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static Microsoft.EntityFrameworkCore.DbLoggerCategory;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class RolesRepository : IRolesRepository<UsuariosRol>
    {

        private readonly SistemaOroAmbientalContext _dbcontext;

        public RolesRepository(SistemaOroAmbientalContext context)
        {
            _dbcontext = context;
        }
        public async Task<bool> Actualizar(UsuariosRol model)
        {
            _dbcontext.UsuariosRoles.Update(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            UsuariosRol model = _dbcontext.UsuariosRoles.First(c => c.Id == id);
            _dbcontext.UsuariosRoles.Remove(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(UsuariosRol model)
        {
            _dbcontext.UsuariosRoles.Add(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<UsuariosRol> Obtener(int id)
        {
            UsuariosRol model = await _dbcontext.UsuariosRoles.FindAsync(id);
            return model;
        }
        public async Task<IQueryable<UsuariosRol>> ObtenerTodos()
        {
            IQueryable<UsuariosRol> query = _dbcontext.UsuariosRoles;
            return await Task.FromResult(query);
        }




    }
}
