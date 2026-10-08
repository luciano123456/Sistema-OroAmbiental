using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class ClientesEstablecimientosService : IClientesEstablecimientosService
    {
        private readonly IClientesEstablecimientosRepository _repo;
        private readonly IEntidadCascadeRepository _cascadeRepo;
        private readonly IRecorridosRepository _recorridosRepo;

        public ClientesEstablecimientosService(
            IClientesEstablecimientosRepository repo,
            IEntidadCascadeRepository cascadeRepo,
            IRecorridosRepository recorridosRepo)
        {
            _repo = repo;
            _cascadeRepo = cascadeRepo;
            _recorridosRepo = recorridosRepo;
        }

        public async Task<ServiceResult> Insertar(ClientesEstablecimiento model, bool desplazarOrdenRecorrido = false)
        {
            var validacion = Validar(model);
            if (validacion != null) return validacion;

            var dup = await _repo.BuscarDuplicado(null, model.IdEstablecimientoCliente);
            if (dup != null)
            {
                return ServiceResult.Error(
                    $"Ya existe un establecimiento con Id del ministerio '{dup.IdEstablecimientoCliente}' ({dup.Nombre}).",
                    "duplicado",
                    dup.Id);
            }

            if (desplazarOrdenRecorrido)
                await DesplazarSiCorresponde(model, null);

            var ok = await _repo.Insertar(model);
            if (!ok)
                return ServiceResult.Error("No se pudo guardar");

            await SyncRecorridosSafe(model.Id, model.IdUsuarioRegistra);
            return ServiceResult.Success("Establecimiento registrado correctamente");
        }

        public async Task<ServiceResult> Actualizar(ClientesEstablecimiento model, bool desplazarOrdenRecorrido = false)
        {
            var validacion = Validar(model);
            if (validacion != null) return validacion;

            var dup = await _repo.BuscarDuplicado(model.Id, model.IdEstablecimientoCliente);
            if (dup != null)
            {
                return ServiceResult.Error(
                    $"Ya existe un establecimiento con Id del ministerio '{dup.IdEstablecimientoCliente}' ({dup.Nombre}).",
                    "duplicado",
                    dup.Id);
            }

            if (desplazarOrdenRecorrido)
                await DesplazarSiCorresponde(model, model.Id);

            var ok = await _repo.Actualizar(model);
            if (!ok)
                return ServiceResult.Error("No se pudo guardar");

            var idUsuario = model.IdUsuarioModifica ?? model.IdUsuarioRegistra;
            await SyncRecorridosSafe(model.Id, idUsuario);
            return ServiceResult.Success("Establecimiento modificado correctamente");
        }

        public Task<DependenciasEliminacionInfo> ObtenerDependenciasEliminar(int id)
            => _cascadeRepo.ObtenerDependenciasEstablecimientoAsync(id);

        public Task<ServiceResult> Eliminar(int id, bool cascada = false)
            => DeleteOperationHelper.ExecuteCascadeAsync(
                id,
                cascada,
                "el establecimiento",
                () => _cascadeRepo.ObtenerDependenciasEstablecimientoAsync(id),
                () => _cascadeRepo.EliminarEstablecimientoEnCascadaAsync(id),
                () => DeleteOperationHelper.ExecuteAsync(
                    () => _repo.Eliminar(id),
                    "el establecimiento",
                    "Establecimiento eliminado correctamente",
                    id),
                "Establecimiento y todos sus registros asociados fueron eliminados correctamente.",
                "Error inesperado al eliminar el establecimiento en cascada.");

        public Task<ClientesEstablecimiento?> Obtener(int id) => _repo.Obtener(id);

        public Task<IQueryable<ClientesEstablecimiento>> ObtenerTodos() => _repo.ObtenerTodos();

        public Task<List<ClientesEstablecimiento>> ListarPorCliente(int idCliente) => _repo.ListarPorCliente(idCliente);

        public Task<GrillaPaginadaResult<ClientesEstablecimiento>> ListarPaginado(GrillaPaginadaConsulta consulta)
            => _repo.ListarPaginado(consulta);

        public Task<int> ObtenerIndiceEnLista(int id, GrillaPaginadaConsulta consulta)
            => _repo.ObtenerIndiceEnLista(id, consulta);

        public Task<OrdenRecorridoOcupanteDto> ObtenerOcupanteOrdenRecorrido(
            int idCamion, int idDia, int idSemana, int orden, int? idExcluirEstablecimiento)
            => _repo.ObtenerOcupanteOrdenRecorrido(idCamion, idDia, idSemana, orden, idExcluirEstablecimiento);

        public Task<Dictionary<int, List<VisitaRecorridoTexto>>> ListarVisitas(IReadOnlyCollection<int> idsEstablecimiento)
            => _repo.ListarVisitas(idsEstablecimiento);

        public async Task GuardarVisitasAdicionales(
            int idEstablecimiento,
            IReadOnlyList<ClientesEstablecimientosDia> visitas,
            int idUsuario,
            bool desplazarOrden)
        {
            if (idEstablecimiento <= 0)
                return;

            if (desplazarOrden)
            {
                foreach (var visita in visitas)
                {
                    if (visita.OrdenRecorrido is not > 0 || visita.IdCamion is not > 0
                        || visita.IdDia <= 0 || visita.IdSemana is not > 0)
                        continue;

                    await _repo.DesplazarOrdenRecorridoSiOcupado(
                        visita.IdCamion.Value,
                        visita.IdDia,
                        visita.IdSemana.Value,
                        visita.OrdenRecorrido.Value,
                        idEstablecimiento);
                }
            }

            await _repo.ReemplazarDiasAdicionales(idEstablecimiento, visitas, idUsuario);
            await SyncRecorridosSafe(idEstablecimiento, idUsuario);
        }

        private Task DesplazarSiCorresponde(ClientesEstablecimiento model, int? idExcluir)
        {
            if (model.OrdenRecorrido is not > 0 || model.IdCamion is not > 0
                || model.IdDiaRecoleccion is not > 0 || model.IdSemanaRecoleccion is not > 0)
                return Task.CompletedTask;

            return _repo.DesplazarOrdenRecorridoSiOcupado(
                model.IdCamion.Value,
                model.IdDiaRecoleccion.Value,
                model.IdSemanaRecoleccion.Value,
                model.OrdenRecorrido.Value,
                idExcluir);
        }

        private async Task SyncRecorridosSafe(int idEstablecimiento, int idUsuario)
        {
            if (idEstablecimiento <= 0) return;
            try
            {
                await _recorridosRepo.SyncEstablecimientoEnRecorridos(idEstablecimiento, idUsuario);
            }
            catch
            {
                // El alta/edición del establecimiento no debe fallar si la sync de ruta falla.
            }
        }

        private static ServiceResult? Validar(ClientesEstablecimiento model)
        {
            IntercambioTxtCampos.Aplicar(model);

            if (model.IdCliente <= 0)
                return ServiceResult.Error("Debe seleccionar un cliente.", "validacion");

            if (string.IsNullOrWhiteSpace(model.Nombre))
                return ServiceResult.Error("El nombre es obligatorio.", "validacion");

            var sinHorario = model.HorarioRecoleccionDesde == default
                && model.HorarioRecoleccionHasta == default;
            if (string.IsNullOrWhiteSpace(model.DiasHorarios)
                && !sinHorario
                && model.HorarioRecoleccionHasta <= model.HorarioRecoleccionDesde)
                return ServiceResult.Error("El horario hasta debe ser mayor al horario desde.", "validacion");

            return null;
        }
    }
}
