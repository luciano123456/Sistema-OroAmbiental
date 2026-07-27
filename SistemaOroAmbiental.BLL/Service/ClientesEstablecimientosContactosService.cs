using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class ClientesEstablecimientosContactosService : IClientesEstablecimientosContactosService
    {
        private readonly IClientesEstablecimientosContactosRepository _repo;

        public ClientesEstablecimientosContactosService(IClientesEstablecimientosContactosRepository repo)
        {
            _repo = repo;
        }

        public Task<List<ClientesEstablecimientosContacto>> ObtenerPorEstablecimiento(int idEstablecimiento)
            => _repo.ObtenerPorEstablecimiento(idEstablecimiento);

        public async Task<ServiceResult> Insertar(ClientesEstablecimientosContacto model)
        {
            if (model.IdEstablecimiento <= 0)
                return ServiceResult.Error("Debe guardar el establecimiento antes de agregar contactos.", "validacion");

            if (string.IsNullOrWhiteSpace(model.Nombre))
                return ServiceResult.Error("El nombre del contacto es obligatorio.", "validacion");

            var dup = await _repo.BuscarDuplicado(null, model.IdEstablecimiento, model.Nombre.Trim());
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

        public async Task<ServiceResult> Actualizar(ClientesEstablecimientosContacto model)
        {
            if (model.Id <= 0 || model.IdEstablecimiento <= 0)
                return ServiceResult.Error("Contacto inválido.", "validacion");

            if (string.IsNullOrWhiteSpace(model.Nombre))
                return ServiceResult.Error("El nombre del contacto es obligatorio.", "validacion");

            var dup = await _repo.BuscarDuplicado(model.Id, model.IdEstablecimiento, model.Nombre.Trim());
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
                "el contacto del establecimiento",
                "Contacto eliminado correctamente",
                id);
    }
}
