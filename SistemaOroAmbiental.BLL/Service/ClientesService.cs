using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class ClientesService : IClientesService
    {
        private readonly IClientesRepository _repo;

        public ClientesService(IClientesRepository repo)
        {
            _repo = repo;
        }

        public async Task<ServiceResult> Insertar(Cliente model)
        {
            if (string.IsNullOrWhiteSpace(model.Nombre) ||
                string.IsNullOrWhiteSpace(model.Cuit) ||
                model.IdSucursal <= 0)
            {
                return ServiceResult.Error(
                    "Debe completar los campos obligatorios.",
                    "validacion");
            }

            var dup = await _repo.BuscarDuplicado(null, model.Nombre, model.Cuit);

            if (dup != null)
            {
                return ServiceResult.Error(
                    $"Ya existe un cliente: '{dup.Nombre}'.",
                    "duplicado",
                    dup.Id);
            }

            var ok = await _repo.Insertar(model);

            return ok
                ? ServiceResult.Success("Cliente registrado correctamente")
                : ServiceResult.Error("No se pudo guardar");
        }

        public async Task<ServiceResult> Actualizar(Cliente model)
        {
            if (string.IsNullOrWhiteSpace(model.Nombre) ||
                string.IsNullOrWhiteSpace(model.Cuit) ||
                model.IdSucursal <= 0)
            {
                return ServiceResult.Error(
                    "Debe completar los campos obligatorios.",
                    "validacion");
            }

            var dup = await _repo.BuscarDuplicado(model.Id, model.Nombre, model.Cuit);

            if (dup != null)
            {
                return ServiceResult.Error(
                    $"Ya existe un cliente: '{dup.Nombre}'.",
                    "duplicado",
                    dup.Id);
            }

            var ok = await _repo.Actualizar(model);

            return ok
                ? ServiceResult.Success("Cliente modificado correctamente")
                : ServiceResult.Error("No se pudo guardar");
        }

        public async Task<ServiceResult> Eliminar(int id)
        {
            try
            {
                var ok = await _repo.Eliminar(id);

                if (!ok)
                    return ServiceResult.Error("No se encontró el registro.");

                return ServiceResult.Success("Cliente eliminado correctamente");
            }
            catch (DbUpdateException)
            {
                return ServiceResult.Error(
                    "No se puede eliminar porque posee registros relacionados.",
                    "relacion",
                    id);
            }
            catch
            {
                return ServiceResult.Error("Error inesperado.");
            }
        }

        public Task<Cliente?> Obtener(int id)
            => _repo.Obtener(id);

        public Task<IQueryable<Cliente>> ObtenerTodos()
            => _repo.ObtenerTodos();
    }
}
