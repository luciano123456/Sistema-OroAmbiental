using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IContratosRepository
    {
        Task<List<Contrato>> ListarFiltrado(int? idCliente, bool? soloVigentes, string? texto);

        Task<IQueryable<Contrato>> ObtenerTodos();

        Task<Contrato?> Obtener(int id);

        Task<Contrato?> BuscarDuplicado(int? idExcluir, int idCliente, int idEstablecimiento);

        Task<bool> TieneEntregas(int id);

        Task<bool> Insertar(Contrato model);

        Task<bool> Actualizar(Contrato model);

        Task<bool> Eliminar(int id);

        Task<bool> ActualizarVencimientoSiMayor(int idContrato, DateTime fechaVencimiento);
    }
}
