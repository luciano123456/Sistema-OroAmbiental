namespace SistemaOroAmbiental.DAL.Repository
{
    /// <summary>
    /// Valida dependencias antes de eliminar y devuelve mensaje descriptivo si hay bloqueo.
    /// </summary>
    public interface IDeleteConflictChecker
    {
        Task<string?> ClienteAsync(int id);
        Task<string?> ProveedorAsync(int id);
        Task<string?> ProductoAsync(int id);
        Task<string?> EstablecimientoAsync(int id);
        Task<string?> ContratoAsync(int id);
        Task<string?> CompraAsync(int id);
        Task<string?> EntregaAsync(int id);
        Task<string?> ListaPrecioAsync(int id);
        Task<string?> SucursalAsync(int id);
        Task<string?> GastoAsync(int id);
        Task<string?> CuentaAsync(int id);
        Task<string?> CatalogoAsync<T>(int id) where T : class;
    }
}
