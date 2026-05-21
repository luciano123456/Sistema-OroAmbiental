using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class ClientesContactosService : IClientesContactosService
    {
        private readonly IClientesContactosRepository _repo;

        public ClientesContactosService(IClientesContactosRepository repo)
        {
            _repo = repo;
        }

        public Task<List<ClientesContacto>> ObtenerPorCliente(int idCliente)
            => _repo.ObtenerPorCliente(idCliente);

        public Task<ClientesContacto?> Obtener(int id)
            => _repo.Obtener(id);

        public async Task<ServiceResult> Insertar(ClientesContacto model)
        {
            if (model.IdCliente <= 0)
                return ServiceResult.Error("Debe guardar el cliente antes de agregar contactos.", "validacion");

            if (string.IsNullOrWhiteSpace(model.Nombre))
                return ServiceResult.Error("El nombre del contacto es obligatorio.", "validacion");

            var dup = await _repo.BuscarDuplicado(null, model.IdCliente, model.Nombre.Trim());
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

        public async Task<ServiceResult> Actualizar(ClientesContacto model)
        {
            if (model.Id <= 0 || model.IdCliente <= 0)
                return ServiceResult.Error("Contacto inválido.", "validacion");

            if (string.IsNullOrWhiteSpace(model.Nombre))
                return ServiceResult.Error("El nombre del contacto es obligatorio.", "validacion");

            var dup = await _repo.BuscarDuplicado(model.Id, model.IdCliente, model.Nombre.Trim());
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

        public async Task<ServiceResult> Eliminar(int id)
        {
            var ok = await _repo.Eliminar(id);

            return ok
                ? ServiceResult.Success("Contacto eliminado correctamente")
                : ServiceResult.Error("No se pudo eliminar el contacto");
        }
    }
}
