using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class ClientesEstablecimientosTercerosService : IClientesEstablecimientosTercerosService
    {
        private readonly IClientesEstablecimientosTercerosRepository _repo;

        public ClientesEstablecimientosTercerosService(IClientesEstablecimientosTercerosRepository repo)
        {
            _repo = repo;
        }

        public Task<List<ClientesEstablecimientosTercero>> ObtenerPorEstablecimiento(int idEstablecimiento, bool soloActivos = false)
            => _repo.ObtenerPorEstablecimiento(idEstablecimiento, soloActivos);

        public Task<List<ClientesEstablecimientosTercero>> ObtenerPorCliente(int idCliente, bool soloActivos = false)
            => _repo.ObtenerPorCliente(idCliente, soloActivos);

        public Task<List<TerceroPagoAnalisisItem>> AnalisisPorEstablecimiento(int idEstablecimiento)
            => _repo.AnalisisPorEstablecimiento(idEstablecimiento);

        public async Task<ServiceResult> Insertar(ClientesEstablecimientosTercero model)
        {
            if (model.IdEstablecimiento <= 0)
                return ServiceResult.Error("Debe guardar el establecimiento antes de agregar pagadores.", "validacion");

            if (string.IsNullOrWhiteSpace(model.Nombre))
                return ServiceResult.Error("El nombre es obligatorio.", "validacion");

            model.Nombre = model.Nombre.Trim();
            var dup = await _repo.BuscarDuplicado(null, model.IdEstablecimiento, model.Nombre);
            if (dup != null)
                return ServiceResult.Error($"Ya existe un pagador con el nombre '{dup.Nombre}'.", "duplicado", dup.Id);

            var ok = await _repo.Insertar(model);
            return ok
                ? ServiceResult.Success("Pagador registrado correctamente")
                : ServiceResult.Error("No se pudo guardar el pagador");
        }

        public async Task<ServiceResult> Actualizar(ClientesEstablecimientosTercero model)
        {
            if (model.Id <= 0 || model.IdEstablecimiento <= 0)
                return ServiceResult.Error("Pagador inválido.", "validacion");

            if (string.IsNullOrWhiteSpace(model.Nombre))
                return ServiceResult.Error("El nombre es obligatorio.", "validacion");

            model.Nombre = model.Nombre.Trim();
            var dup = await _repo.BuscarDuplicado(model.Id, model.IdEstablecimiento, model.Nombre);
            if (dup != null)
                return ServiceResult.Error($"Ya existe un pagador con el nombre '{dup.Nombre}'.", "duplicado", dup.Id);

            var ok = await _repo.Actualizar(model);
            return ok
                ? ServiceResult.Success("Pagador modificado correctamente")
                : ServiceResult.Error("No se pudo guardar el pagador");
        }

        public async Task<ServiceResult> Eliminar(int id)
        {
            var n = await _repo.ContarCobros(id);
            if (n > 0)
            {
                return ServiceResult.Error(
                    $"Este pagador tiene {n} cobro(s). Desactivalo en vez de borrarlo para no perder el historial.",
                    "validacion");
            }

            return await DeleteOperationHelper.ExecuteAsync(
                () => _repo.Eliminar(id),
                "el pagador de terceros",
                "Pagador eliminado correctamente",
                id);
        }
    }
}
