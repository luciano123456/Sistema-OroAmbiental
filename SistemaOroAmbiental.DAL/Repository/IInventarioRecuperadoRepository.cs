namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IInventarioRecuperadoRepository
    {
        Task RegistrarEntrada(
            int idSucursal,
            int idProducto,
            decimal cantidad,
            DateTime fecha,
            string concepto,
            string tipoMovimiento,
            int idMovimiento,
            int idUsuario);

        Task RevertirMovimientosEntrega(int idEntrega);

        Task EliminarMovimientoManual(int idMovimiento);
    }
}
