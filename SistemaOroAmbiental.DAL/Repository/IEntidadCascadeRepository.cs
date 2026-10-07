using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IEntidadCascadeRepository
    {
        Task<DependenciasEliminacionInfo> ObtenerDependenciasClienteAsync(int idCliente);
        Task<DependenciasEliminacionInfo> ObtenerDependenciasProveedorAsync(int idProveedor);
        Task<DependenciasEliminacionInfo> ObtenerDependenciasProductoAsync(int idProducto);
        Task<DependenciasEliminacionInfo> ObtenerDependenciasEstablecimientoAsync(int idEstablecimiento);
        Task<DependenciasEliminacionInfo> ObtenerDependenciasContratoAsync(int idContrato);
        Task<DependenciasEliminacionInfo> ObtenerDependenciasChoferAsync(int idChofer);
        Task<DependenciasEliminacionInfo> ObtenerDependenciasFirmaAsync(int idFirma);
        Task<DependenciasEliminacionInfo> ObtenerDependenciasUsuarioAsync(int idUsuario);
        Task<DependenciasEliminacionInfo> ObtenerDependenciasCompraAsync(int idCompra);
        Task<DependenciasEliminacionInfo> ObtenerDependenciasEntregaAsync(int idEntrega);
        Task<DependenciasEliminacionInfo> ObtenerDependenciasGastoAsync(int idGasto);

        Task EliminarClienteEnCascadaAsync(int idCliente);
        Task EliminarProveedorEnCascadaAsync(int idProveedor);
        Task EliminarProductoEnCascadaAsync(int idProducto);
        Task EliminarEstablecimientoEnCascadaAsync(int idEstablecimiento);
        Task EliminarContratoEnCascadaAsync(int idContrato);
        Task EliminarChoferEnCascadaAsync(int idChofer);
        Task EliminarFirmaEnCascadaAsync(int idFirma);
        Task EliminarUsuarioEnCascadaAsync(int idUsuario);
        Task EliminarCompraEnCascadaAsync(int idCompra);
        Task EliminarEntregaEnCascadaAsync(int idEntrega);
        Task EliminarGastoEnCascadaAsync(int idGasto);
    }
}
