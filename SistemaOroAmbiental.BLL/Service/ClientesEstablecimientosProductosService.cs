using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class ClientesEstablecimientosProductosService : IClientesEstablecimientosProductosService
    {
        private readonly IClientesEstablecimientosProductosRepository _repo;

        public ClientesEstablecimientosProductosService(IClientesEstablecimientosProductosRepository repo)
        {
            _repo = repo;
        }

        public Task<List<ClientesEstablecimientosProducto>> ObtenerPorEstablecimiento(int idEstablecimiento)
            => _repo.ObtenerPorEstablecimiento(idEstablecimiento);

        public async Task<ServiceResult> Insertar(ClientesEstablecimientosProducto model)
        {
            if (model.IdEstablecimiento <= 0)
                return ServiceResult.Error("Debe guardar el establecimiento antes de agregar productos.", "validacion");

            if (model.IdProducto <= 0)
                return ServiceResult.Error("Debe seleccionar un producto.", "validacion");

            if (model.Cantidad <= 0)
                return ServiceResult.Error("La cantidad debe ser mayor a cero.", "validacion");

            var dup = await _repo.BuscarDuplicado(null, model.IdEstablecimiento, model.IdProducto);
            if (dup != null)
            {
                return ServiceResult.Error(
                    "El producto ya está asignado a este establecimiento.",
                    "duplicado",
                    dup.Id);
            }

            var ok = await _repo.Insertar(model);
            return ok
                ? ServiceResult.Success("Producto agregado correctamente")
                : ServiceResult.Error("No se pudo guardar");
        }

        public async Task<ServiceResult> Actualizar(ClientesEstablecimientosProducto model)
        {
            if (model.Id <= 0 || model.IdEstablecimiento <= 0)
                return ServiceResult.Error("Registro inválido.", "validacion");

            if (model.IdProducto <= 0)
                return ServiceResult.Error("Debe seleccionar un producto.", "validacion");

            if (model.Cantidad <= 0)
                return ServiceResult.Error("La cantidad debe ser mayor a cero.", "validacion");

            var dup = await _repo.BuscarDuplicado(model.Id, model.IdEstablecimiento, model.IdProducto);
            if (dup != null)
            {
                return ServiceResult.Error(
                    "El producto ya está asignado a este establecimiento.",
                    "duplicado",
                    dup.Id);
            }

            var ok = await _repo.Actualizar(model);
            return ok
                ? ServiceResult.Success("Producto modificado correctamente")
                : ServiceResult.Error("No se pudo guardar");
        }

        public Task<ServiceResult> Eliminar(int id)
            => DeleteOperationHelper.ExecuteAsync(
                () => _repo.Eliminar(id),
                "el producto del establecimiento",
                "Producto quitado del establecimiento",
                id);
    }
}
