using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class ProveedoresService : IProveedoresService
    {
        private readonly IProveedoresRepository _repo;

        public ProveedoresService(IProveedoresRepository repo)
        {
            _repo = repo;
        }

        public async Task<ServiceResult> Insertar(Proveedore model)
        {
            if (!ValidarModelo(model, out var error))
                return ServiceResult.Error(error, "validacion");

            var dup = await _repo.BuscarDuplicado(null, model.Nombre, model.Cuit);

            if (dup != null)
            {
                return ServiceResult.Error(
                    $"Ya existe un proveedor: '{dup.Nombre}'.",
                    "duplicado",
                    dup.Id);
            }

            var ok = await _repo.Insertar(model);

            return ok
                ? ServiceResult.Success("Proveedor registrado correctamente")
                : ServiceResult.Error("No se pudo guardar");
        }

        public async Task<ServiceResult> Actualizar(Proveedore model)
        {
            if (!ValidarModelo(model, out var error))
                return ServiceResult.Error(error, "validacion");

            var dup = await _repo.BuscarDuplicado(model.Id, model.Nombre, model.Cuit);

            if (dup != null)
            {
                return ServiceResult.Error(
                    $"Ya existe un proveedor: '{dup.Nombre}'.",
                    "duplicado",
                    dup.Id);
            }

            var ok = await _repo.Actualizar(model);

            return ok
                ? ServiceResult.Success("Proveedor modificado correctamente")
                : ServiceResult.Error("No se pudo guardar");
        }

        public async Task<ServiceResult> Eliminar(int id)
        {
            try
            {
                var ok = await _repo.Eliminar(id);

                if (!ok)
                    return ServiceResult.Error("No se encontró el registro.");

                return ServiceResult.Success("Proveedor eliminado correctamente");
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

        public Task<Proveedore?> Obtener(int id)
            => _repo.Obtener(id);

        public Task<IQueryable<Proveedore>> ObtenerTodos()
            => _repo.ObtenerTodos();

        private static bool ValidarModelo(Proveedore model, out string error)
        {
            if (string.IsNullOrWhiteSpace(model.Nombre) ||
                string.IsNullOrWhiteSpace(model.Cuit) ||
                model.IdCondicionIva <= 0)
            {
                error = "Debe completar los campos obligatorios.";
                return false;
            }

            error = "";
            return true;
        }
    }
}
