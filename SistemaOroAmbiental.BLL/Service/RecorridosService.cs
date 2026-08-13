using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class RecorridosService : IRecorridosService
    {
        private readonly IRecorridosRepository _repo;

        public RecorridosService(IRecorridosRepository repo)
        {
            _repo = repo;
        }

        public Task<List<RecorridosMatrizDto>> ObtenerMatriz(int? idCamion)
            => _repo.ObtenerMatriz(idCamion);

        public async Task<ServiceResult> GuardarCeldaMatriz(RecorridosMatriz model)
        {
            if (!ValidarCeldaMatriz(model, out var error))
                return ServiceResult.Error(error, "validacion");

            var (ok, repoError) = await _repo.GuardarCeldaMatriz(model);

            return ok
                ? ServiceResult.Success("Zona guardada correctamente")
                : ServiceResult.Error(
                    string.IsNullOrWhiteSpace(repoError)
                        ? "No se pudo guardar la zona."
                        : repoError,
                    "error");
        }

        public Task<List<ClientesRecorridoDto>> ListarClientesPorRecorrido(int idCamion, int idSemana, int idDia)
        {
            if (idCamion <= 0 || idSemana <= 0 || idDia <= 0)
                return Task.FromResult(new List<ClientesRecorridoDto>());

            return _repo.ListarClientesPorRecorrido(idCamion, idSemana, idDia);
        }

        public Task<List<ClientesRecorridoDto>> BuscarClientesRecorrido(
            string texto,
            int? idCamion,
            int? idSemana,
            int? idDia)
            => _repo.BuscarClientesRecorrido(texto ?? "", idCamion, idSemana, idDia);

        public Task<List<ClientesRecorridoDto>> ListarPorCliente(int idCliente)
        {
            if (idCliente <= 0)
                return Task.FromResult(new List<ClientesRecorridoDto>());

            return _repo.ListarPorCliente(idCliente);
        }

        public async Task<ServiceResult> InsertarClientesRecorrido(ClientesRecorrido model)
        {
            if (!ValidarClientesRecorrido(model, out var error))
                return ServiceResult.Error(error, "validacion");

            var ok = await _repo.InsertarClientesRecorrido(model);

            return ok
                ? ServiceResult.Success("Cliente agregado al recorrido")
                : ServiceResult.Error("No se pudo guardar");
        }

        public async Task<ServiceResult> ActualizarClientesRecorrido(ClientesRecorrido model)
        {
            if (model.Id <= 0)
                return ServiceResult.Error("Registro inválido.", "validacion");

            if (!ValidarClientesRecorrido(model, out var error))
                return ServiceResult.Error(error, "validacion");

            var ok = await _repo.ActualizarClientesRecorrido(model);

            return ok
                ? ServiceResult.Success("Recorrido de cliente modificado")
                : ServiceResult.Error("No se pudo guardar");
        }

        public Task<ServiceResult> EliminarClientesRecorrido(int id)
            => DeleteOperationHelper.ExecuteAsync(
                () => _repo.EliminarClientesRecorrido(id),
                "el cliente del recorrido",
                "Cliente eliminado del recorrido",
                id);

        public Task<ClientesRecorrido?> ObtenerClientesRecorrido(int id)
            => _repo.ObtenerClientesRecorrido(id);

        public Task<HojaRutaDto?> ObtenerHojaRuta(
            int idCamion,
            IReadOnlyList<(int IdSemana, int IdDia)> recorridos,
            DateTime fecha,
            IReadOnlyCollection<int>? idsRecorridoExcluir = null)
        {
            if (idCamion <= 0 || recorridos == null || recorridos.Count == 0)
                return Task.FromResult<HojaRutaDto?>(null);

            return _repo.ObtenerHojaRuta(idCamion, recorridos, fecha.Date, idsRecorridoExcluir);
        }

        public Task<List<RecorridoSugeridoDto>> ListarSugeridosPorRecoleccion(int idCamion, int idSemana, int idDia)
        {
            if (idCamion <= 0 || idSemana <= 0 || idDia <= 0)
                return Task.FromResult(new List<RecorridoSugeridoDto>());

            return _repo.ListarSugeridosPorRecoleccion(idCamion, idSemana, idDia);
        }

        public async Task<ServiceResult> InsertarClientesRecorridoBulk(
            int idCamion,
            int idSemana,
            int idDia,
            int idUsuario,
            IReadOnlyList<(int IdCliente, int? IdEstablecimiento)> items)
        {
            if (idCamion <= 0 || idSemana <= 0 || idDia <= 0)
                return ServiceResult.Error("Recorrido inválido.", "validacion");

            if (items == null || items.Count == 0)
                return ServiceResult.Error("No hay clientes para agregar.", "validacion");

            if (items.Any(x => x.IdCliente <= 0))
                return ServiceResult.Error("Hay clientes inválidos en la selección.", "validacion");

            var (insertados, error) = await _repo.InsertarClientesRecorridoBulk(
                idCamion, idSemana, idDia, idUsuario, items);

            if (!string.IsNullOrWhiteSpace(error))
                return ServiceResult.Error(error, "error");

            if (insertados <= 0)
                return ServiceResult.Error("Ningún cliente nuevo pudo agregarse (ya estaban en la ruta).", "validacion");

            return ServiceResult.Success(
                insertados == 1
                    ? "1 cliente agregado al recorrido."
                    : $"{insertados} clientes agregados al recorrido.");
        }

        public async Task<ServiceResult> SyncEstablecimientoEnRecorridos(int idEstablecimiento, int idUsuario)
        {
            if (idEstablecimiento <= 0)
                return ServiceResult.Error("Establecimiento inválido.", "validacion");

            var (ok, error) = await _repo.SyncEstablecimientoEnRecorridos(idEstablecimiento, idUsuario);
            return ok
                ? ServiceResult.Success("Recorridos sincronizados.")
                : ServiceResult.Error(string.IsNullOrWhiteSpace(error) ? "No se pudo sincronizar el recorrido." : error);
        }

        private static bool ValidarCeldaMatriz(RecorridosMatriz model, out string error)
        {
            if (model.IdCamion <= 0 || model.IdSemana <= 0 || model.IdDia <= 0)
            {
                error = "Debe seleccionar unidad, semana y día.";
                return false;
            }

            var zona = (model.Zona ?? "").Trim();
            var salida = (model.HorarioSalida ?? "").Trim();

            if (string.IsNullOrWhiteSpace(zona) && string.IsNullOrWhiteSpace(salida))
            {
                error = "Ingresá la zona o el horario de salida.";
                return false;
            }

            if (zona.Length > 120)
            {
                error = "La zona no puede superar 120 caracteres.";
                return false;
            }

            if (salida.Length > 20)
            {
                error = "El horario de salida no puede superar 20 caracteres.";
                return false;
            }

            model.Zona = zona;
            model.HorarioSalida = string.IsNullOrWhiteSpace(salida) ? null : salida;

            error = "";
            return true;
        }

        private static bool ValidarClientesRecorrido(ClientesRecorrido model, out string error)
        {
            if (model.IdCliente <= 0)
            {
                error = "Debe seleccionar un cliente.";
                return false;
            }

            if (model.IdCamion <= 0 || model.IdSemana <= 0 || model.IdDia <= 0)
            {
                error = "Debe indicar unidad, semana y día del recorrido.";
                return false;
            }

            // Posicion <= 0 se resuelve en el repositorio con OrdenRecorrido o último+1.

            if (!string.IsNullOrWhiteSpace(model.Observacion) && model.Observacion.Trim().Length > 500)
            {
                error = "La observación no puede superar 500 caracteres.";
                return false;
            }

            error = "";
            return true;
        }
    }
}
