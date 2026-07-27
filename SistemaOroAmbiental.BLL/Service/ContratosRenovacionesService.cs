using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class ContratosRenovacionesService : IContratosRenovacionesService
    {
        private readonly IContratosRenovacionesRepository _repo;

        public ContratosRenovacionesService(IContratosRenovacionesRepository repo)
        {
            _repo = repo;
        }

        public Task<List<ContratosRenovacion>> ObtenerPorContrato(int idContrato)
            => _repo.ObtenerPorContrato(idContrato);

        public async Task<ServiceResult> Insertar(ContratosRenovacion model)
        {
            var validacion = Validar(model);
            if (validacion != null) return validacion;

            if (model.IdContrato <= 0)
                return ServiceResult.Error("Guarde el contrato antes de registrar renovaciones.", "validacion");

            var (ok, errorDb) = await _repo.Insertar(model);
            if (!ok)
                return ServiceResult.Error(errorDb ?? "No se pudo guardar la renovación.");

            return new ServiceResult
            {
                Ok = true,
                Mensaje = "Renovación registrada correctamente",
                Tipo = "success",
                IdReferencia = model.Id
            };
        }

        public async Task<ServiceResult> Actualizar(ContratosRenovacion model)
        {
            var validacion = Validar(model);
            if (validacion != null) return validacion;

            var (ok, errorDb) = await _repo.Actualizar(model);
            return ok
                ? ServiceResult.Success("Renovación modificada correctamente")
                : ServiceResult.Error(errorDb ?? "No se pudo guardar la renovación.");
        }

        public Task<ServiceResult> Eliminar(int id)
            => DeleteOperationHelper.ExecuteAsync(
                () => _repo.Eliminar(id),
                "la renovación",
                "Renovación eliminada correctamente",
                id);

        private static ServiceResult? Validar(ContratosRenovacion model)
        {
            if (string.IsNullOrWhiteSpace(model.Tipo))
                return ServiceResult.Error("Indique el tipo de renovación.", "validacion");

            if (model.FechaInicio == default)
                return ServiceResult.Error("Indique la fecha de inicio.", "validacion");

            if (model.FechaVencimiento == default)
                return ServiceResult.Error("Indique la fecha de vencimiento.", "validacion");

            if (model.FechaVencimiento < model.FechaInicio)
                return ServiceResult.Error("La fecha de vencimiento no puede ser anterior al inicio.", "validacion");

            return null;
        }
    }
}
