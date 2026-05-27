using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class ProveedoresContactosService : IProveedoresContactosService
    {
        private readonly IProveedoresContactosRepository _repo;

        public ProveedoresContactosService(IProveedoresContactosRepository repo)
        {
            _repo = repo;
        }

        public Task<List<ProveedoresContacto>> ObtenerPorProveedor(int idProveedor)
            => _repo.ObtenerPorProveedor(idProveedor);

        public Task<ProveedoresContacto?> Obtener(int id)
            => _repo.Obtener(id);

        public async Task<ServiceResult> Insertar(ProveedoresContacto model)
        {
            if (model.IdProveedor <= 0)
                return ServiceResult.Error("Debe guardar el proveedor antes de agregar contactos.", "validacion");

            if (string.IsNullOrWhiteSpace(model.Nombre))
                return ServiceResult.Error("El nombre del contacto es obligatorio.", "validacion");

            var dup = await _repo.BuscarDuplicado(null, model.IdProveedor, model.Nombre.Trim());
            if (dup != null)
            {
                return ServiceResult.Error(
                    $"Ya existe un contacto con el nombre '{dup.Nombre}'.",
                    "duplicado",
                    dup.Id);
            }

            var ok = await _repo.Insertar(model);

            return ok
                ? ServiceResult.Success("Contacto registrado correctamente")
                : ServiceResult.Error("No se pudo guardar el contacto");
        }

        public async Task<ServiceResult> Actualizar(ProveedoresContacto model)
        {
            if (model.Id <= 0 || model.IdProveedor <= 0)
                return ServiceResult.Error("Contacto inválido.", "validacion");

            if (string.IsNullOrWhiteSpace(model.Nombre))
                return ServiceResult.Error("El nombre del contacto es obligatorio.", "validacion");

            var dup = await _repo.BuscarDuplicado(model.Id, model.IdProveedor, model.Nombre.Trim());
            if (dup != null)
            {
                return ServiceResult.Error(
                    $"Ya existe un contacto con el nombre '{dup.Nombre}'.",
                    "duplicado",
                    dup.Id);
            }

            var ok = await _repo.Actualizar(model);

            return ok
                ? ServiceResult.Success("Contacto modificado correctamente")
                : ServiceResult.Error("No se pudo guardar el contacto");
        }

        public Task<ServiceResult> Eliminar(int id)
            => DeleteOperationHelper.ExecuteAsync(
                () => _repo.Eliminar(id),
                "el contacto",
                "Contacto eliminado correctamente",
                id);
    }
}
