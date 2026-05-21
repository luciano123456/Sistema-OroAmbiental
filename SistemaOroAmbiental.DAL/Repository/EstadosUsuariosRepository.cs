using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.Models;
using System;
using System.Collections.Generic;
using System.Diagnostics.Contracts;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static Microsoft.EntityFrameworkCore.DbLoggerCategory;
using SistemaOroAmbiental.DAL.DataContext;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class UsuariosEstadosRepository : IEstadosUsuariosRepository<UsuariosEstado>
    {

        private readonly SistemaOroAmbientalContext _dbcontext;

        public UsuariosEstadosRepository(SistemaOroAmbientalContext context)
        {
            _dbcontext = context;
        }
        public async Task<bool> Actualizar(UsuariosEstado model)
        {
            _dbcontext.UsuariosEstados.Update(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            UsuariosEstado model = _dbcontext.UsuariosEstados.First(c => c.Id == id);
            _dbcontext.UsuariosEstados.Remove(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(UsuariosEstado model)
        {
            _dbcontext.UsuariosEstados.Add(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<UsuariosEstado> Obtener(int id)
        {
            UsuariosEstado model = await _dbcontext.UsuariosEstados.FindAsync(id);
            return model;
        }
        public async Task<IQueryable<UsuariosEstado>> ObtenerTodos()
        {
            IQueryable<UsuariosEstado> query = _dbcontext.UsuariosEstados;
            return await Task.FromResult(query);
        }




    }
}
