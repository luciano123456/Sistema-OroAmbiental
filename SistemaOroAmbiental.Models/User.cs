using System;
using System.Collections.Generic;

namespace SistemaOroAmbiental.Models;

public partial class User
{
    public int Id { get; set; }

    public string? Usuario { get; set; }

    public string? Nombre { get; set; }

    public string? Apellido { get; set; }

    public string? Dni { get; set; }

    public string Telefono { get; set; } = null!;

    public string Direccion { get; set; } = null!;

    public int IdRol { get; set; }

    public string Contrasena { get; set; } = null!;

    public int IdEstado { get; set; }

    public int? ModoVendedor { get; set; }

    public string? Correo { get; set; }

    public string? CodigoRecuperacion { get; set; }

    public bool Activo { get; set; } = true;

    /// <summary>UTC. Se actualiza en login/heartbeat; se atrasa al desconectar.</summary>
    public DateTime? FechaUltimaActividad { get; set; }

    /// <summary>Color de fondo del avatar (hex, ej. #3b82f6).</summary>
    public string? AvatarColor { get; set; }

    /// <summary>Clase Font Awesome del icono (sin prefijo fa-), ej. user.</summary>
    public string? AvatarIcono { get; set; }

    /// <summary>Ruta pública de la foto de perfil, ej. /Uploads/Avatares/u_1.jpg.</summary>
    public string? AvatarFoto { get; set; }

    public virtual ICollection<CajasMovimiento> CajasMovimientoIdUsuarioModificaNavigations { get; set; } = new List<CajasMovimiento>();

    public virtual ICollection<CajasMovimiento> CajasMovimientoIdUsuarioRegistraNavigations { get; set; } = new List<CajasMovimiento>();

    public virtual ICollection<Cliente> ClienteIdUsuarioModificaNavigations { get; set; } = new List<Cliente>();

    public virtual ICollection<Cliente> ClienteIdUsuarioRegistraNavigations { get; set; } = new List<Cliente>();

    public virtual ICollection<ClientesCobro> ClientesCobroIdUsuarioModificaNavigations { get; set; } = new List<ClientesCobro>();

    public virtual ICollection<ClientesCobro> ClientesCobroIdUsuarioRegistraNavigations { get; set; } = new List<ClientesCobro>();

    public virtual ICollection<ClientesContacto> ClientesContactoIdUsuarioModificaNavigations { get; set; } = new List<ClientesContacto>();

    public virtual ICollection<ClientesContacto> ClientesContactoIdUsuarioRegistraNavigations { get; set; } = new List<ClientesContacto>();

    public virtual ICollection<ClientesCuentaCorrienteMovimiento> ClientesCuentaCorrienteMovimientoIdUsuarioModificaNavigations { get; set; } = new List<ClientesCuentaCorrienteMovimiento>();

    public virtual ICollection<ClientesCuentaCorrienteMovimiento> ClientesCuentaCorrienteMovimientoIdUsuarioRegistraNavigations { get; set; } = new List<ClientesCuentaCorrienteMovimiento>();

    public virtual ICollection<ClientesEntrega> ClientesEntregaIdUsuarioModificaNavigations { get; set; } = new List<ClientesEntrega>();

    public virtual ICollection<ClientesEntrega> ClientesEntregaIdUsuarioRegistraNavigations { get; set; } = new List<ClientesEntrega>();

    public virtual ICollection<ClientesEntregasProducto> ClientesEntregasProductoIdUsuarioModificaNavigations { get; set; } = new List<ClientesEntregasProducto>();

    public virtual ICollection<ClientesEntregasProducto> ClientesEntregasProductoIdUsuarioRegistraNavigations { get; set; } = new List<ClientesEntregasProducto>();

    public virtual ICollection<ClientesEstablecimiento> ClientesEstablecimientoIdUsuarioModificaNavigations { get; set; } = new List<ClientesEstablecimiento>();

    public virtual ICollection<ClientesEstablecimiento> ClientesEstablecimientoIdUsuarioRegistraNavigations { get; set; } = new List<ClientesEstablecimiento>();

    public virtual ICollection<ClientesEstablecimientosContacto> ClientesEstablecimientosContactoIdUsuarioModificaNavigations { get; set; } = new List<ClientesEstablecimientosContacto>();

    public virtual ICollection<ClientesEstablecimientosContacto> ClientesEstablecimientosContactoIdUsuarioRegistraNavigations { get; set; } = new List<ClientesEstablecimientosContacto>();

    public virtual ICollection<ClientesEstablecimientosDia> ClientesEstablecimientosDiaIdUsuarioModificaNavigations { get; set; } = new List<ClientesEstablecimientosDia>();

    public virtual ICollection<ClientesEstablecimientosDia> ClientesEstablecimientosDiaIdUsuarioRegistraNavigations { get; set; } = new List<ClientesEstablecimientosDia>();

    public virtual ICollection<ClientesEstablecimientosDiasHorario> ClientesEstablecimientosDiasHorarioIdUsuarioModificaNavigations { get; set; } = new List<ClientesEstablecimientosDiasHorario>();

    public virtual ICollection<ClientesEstablecimientosDiasHorario> ClientesEstablecimientosDiasHorarioIdUsuarioRegistraNavigations { get; set; } = new List<ClientesEstablecimientosDiasHorario>();

    public virtual ICollection<ClientesEstablecimientosExcepcione> ClientesEstablecimientosExcepcioneIdUsuarioModificaNavigations { get; set; } = new List<ClientesEstablecimientosExcepcione>();

    public virtual ICollection<ClientesEstablecimientosExcepcione> ClientesEstablecimientosExcepcioneIdUsuarioRegistraNavigations { get; set; } = new List<ClientesEstablecimientosExcepcione>();

    public virtual ICollection<ClientesEstablecimientosProducto> ClientesEstablecimientosProductoIdUsuarioModificaNavigations { get; set; } = new List<ClientesEstablecimientosProducto>();

    public virtual ICollection<ClientesEstablecimientosProducto> ClientesEstablecimientosProductoIdUsuarioRegistraNavigations { get; set; } = new List<ClientesEstablecimientosProducto>();

    public virtual ICollection<Compra> CompraIdUsuarioModificaNavigations { get; set; } = new List<Compra>();

    public virtual ICollection<Compra> CompraIdUsuarioRegistraNavigations { get; set; } = new List<Compra>();

    public virtual ICollection<ComprasProducto> ComprasProductoIdUsuarioModificaNavigations { get; set; } = new List<ComprasProducto>();

    public virtual ICollection<ComprasProducto> ComprasProductoIdUsuarioRegistraNavigations { get; set; } = new List<ComprasProducto>();

    public virtual ICollection<Contrato> ContratoIdUsuarioModificaNavigations { get; set; } = new List<Contrato>();

    public virtual ICollection<Contrato> ContratoIdUsuarioRegistraNavigations { get; set; } = new List<Contrato>();

    public virtual ICollection<ContratosRenovacion> ContratosRenovacioneIdUsuarioModificaNavigations { get; set; } = new List<ContratosRenovacion>();

    public virtual ICollection<ContratosRenovacion> ContratosRenovacioneIdUsuarioRegistraNavigations { get; set; } = new List<ContratosRenovacion>();

    public virtual ICollection<Feriado> FeriadoIdUsuarioModificaNavigations { get; set; } = new List<Feriado>();

    public virtual ICollection<Feriado> FeriadoIdUsuarioRegistraNavigations { get; set; } = new List<Feriado>();

    public virtual ICollection<Gasto> GastoIdUsuarioModificaNavigations { get; set; } = new List<Gasto>();

    public virtual ICollection<Gasto> GastoIdUsuarioRegistraNavigations { get; set; } = new List<Gasto>();

    public virtual UsuariosEstado IdEstadoNavigation { get; set; } = null!;

    public virtual UsuariosRol IdRolNavigation { get; set; } = null!;

    public virtual ICollection<InventarioMovimiento> InventarioMovimientoIdUsuarioModificaNavigations { get; set; } = new List<InventarioMovimiento>();

    public virtual ICollection<InventarioMovimiento> InventarioMovimientoIdUsuarioRegistraNavigations { get; set; } = new List<InventarioMovimiento>();

    public virtual ICollection<InventarioRecuperadoMovimiento> InventarioRecuperadoMovimientoIdUsuarioModificaNavigations { get; set; } = new List<InventarioRecuperadoMovimiento>();

    public virtual ICollection<InventarioRecuperadoMovimiento> InventarioRecuperadoMovimientoIdUsuarioRegistraNavigations { get; set; } = new List<InventarioRecuperadoMovimiento>();

    public virtual ICollection<ListasPrecio> ListasPrecioIdUsuarioModificaNavigations { get; set; } = new List<ListasPrecio>();

    public virtual ICollection<ListasPrecio> ListasPrecioIdUsuarioRegistraNavigations { get; set; } = new List<ListasPrecio>();

    public virtual ICollection<Producto> ProductoIdUsuarioModificaNavigations { get; set; } = new List<Producto>();

    public virtual ICollection<Producto> ProductoIdUsuarioRegistraNavigations { get; set; } = new List<Producto>();

    public virtual ICollection<ProductosPrecio> ProductosPrecioIdUsuarioModificaNavigations { get; set; } = new List<ProductosPrecio>();

    public virtual ICollection<ProductosPrecio> ProductosPrecioIdUsuarioRegistraNavigations { get; set; } = new List<ProductosPrecio>();

    public virtual ICollection<Proveedore> ProveedoreIdUsuarioModificaNavigations { get; set; } = new List<Proveedore>();

    public virtual ICollection<Proveedore> ProveedoreIdUsuarioRegistraNavigations { get; set; } = new List<Proveedore>();

    public virtual ICollection<ProveedoresContacto> ProveedoresContactoIdUsuarioModificaNavigations { get; set; } = new List<ProveedoresContacto>();

    public virtual ICollection<ProveedoresContacto> ProveedoresContactoIdUsuarioRegistraNavigations { get; set; } = new List<ProveedoresContacto>();

    public virtual ICollection<ProveedoresCuentaCorrienteMovimiento> ProveedoresCuentaCorrienteMovimientoIdUsuarioModificaNavigations { get; set; } = new List<ProveedoresCuentaCorrienteMovimiento>();

    public virtual ICollection<ProveedoresCuentaCorrienteMovimiento> ProveedoresCuentaCorrienteMovimientoIdUsuarioRegistraNavigations { get; set; } = new List<ProveedoresCuentaCorrienteMovimiento>();

    public virtual ICollection<ProveedoresPago> ProveedoresPagoIdUsuarioModificaNavigations { get; set; } = new List<ProveedoresPago>();

    public virtual ICollection<ProveedoresPago> ProveedoresPagoIdUsuarioRegistraNavigations { get; set; } = new List<ProveedoresPago>();

    public virtual ICollection<Sucursal> SucursaleIdUsuarioModificaNavigations { get; set; } = new List<Sucursal>();

    public virtual ICollection<Sucursal> SucursaleIdUsuarioRegistraNavigations { get; set; } = new List<Sucursal>();

    public virtual ICollection<UsuariosPermisosUsuario> UsuariosPermisosUsuarioIdUsuarioModificaNavigations { get; set; } = new List<UsuariosPermisosUsuario>();

    public virtual ICollection<UsuariosPermisosUsuario> UsuariosPermisosUsuarioIdUsuarioNavigations { get; set; } = new List<UsuariosPermisosUsuario>();

    public virtual ICollection<UsuariosPermisosUsuario> UsuariosPermisosUsuarioIdUsuarioRegistraNavigations { get; set; } = new List<UsuariosPermisosUsuario>();

    public virtual ICollection<UsuariosSucursal> UsuariosSucursales { get; set; } = new List<UsuariosSucursal>();
}
