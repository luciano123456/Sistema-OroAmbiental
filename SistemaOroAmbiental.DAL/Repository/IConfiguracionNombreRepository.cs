namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IConfiguracionNombreRepository<T> where T : class
    {
        Task<bool> Insertar(T model);

        Task<bool> Actualizar(T model);

        Task<bool> Eliminar(int id);

        Task<T?> Obtener(int id);

        Task<IQueryable<T>> ObtenerTodos();

        /// <summary>
        /// Busca otro registro con el mismo Nombre (comparación por collation de SQL Server).
        /// </summary>
        Task<T?> BuscarDuplicado(int? idExcluir, string? nombre);
    }
}
