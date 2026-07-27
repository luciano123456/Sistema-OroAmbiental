using System;
using System.Collections.Generic;

namespace SistemaOroAmbiental.Models;

public partial class ClientesEstablecimiento
{
    public int Id { get; set; }

    public int IdCliente { get; set; }

    public string Nombre { get; set; } = null!;

    public string? Cuit { get; set; }

    public int? IdCondicionIva { get; set; }

    public string? Domicilio { get; set; }

    public int? IdProvincia { get; set; }

    public string? Localidad { get; set; }

    public string? CodPostal { get; set; }

    public bool ImpuestoIva { get; set; }

    public int IdDiaRecoleccion { get; set; }

    public int IdSemanaRecoleccion { get; set; }

    public int IdListaPrecio { get; set; }

    public TimeSpan HorarioRecoleccionDesde { get; set; }

    public TimeSpan HorarioRecoleccionHasta { get; set; }

    public int? IdCamion { get; set; }

    public int? IdLocalidad { get; set; }

    public int? IdPartido { get; set; }

    public int IdUsuarioRegistra { get; set; }

    public DateTime FechaUsuarioRegistra { get; set; }

    public int? IdUsuarioModifica { get; set; }

    public DateTime? FechaUsuarioModifica { get; set; }

    public virtual ICollection<ClientesEstablecimientosContacto> ClientesEstablecimientosContactos { get; set; } = new List<ClientesEstablecimientosContacto>();

    public virtual ICollection<ClientesEstablecimientosDia> ClientesEstablecimientosDia { get; set; } = new List<ClientesEstablecimientosDia>();

    public virtual ICollection<ClientesEstablecimientosExcepcione> ClientesEstablecimientosExcepciones { get; set; } = new List<ClientesEstablecimientosExcepcione>();

    public virtual ICollection<ClientesEstablecimientosProducto> ClientesEstablecimientosProductos { get; set; } = new List<ClientesEstablecimientosProducto>();

    public virtual ICollection<Contrato> Contratos { get; set; } = new List<Contrato>();

    public virtual Cliente IdClienteNavigation { get; set; } = null!;

    public virtual CondicionesIva? IdCondicionIvaNavigation { get; set; }

    public virtual Dia IdDiaRecoleccionNavigation { get; set; } = null!;

    public virtual ListasPrecio IdListaPrecioNavigation { get; set; } = null!;

    public virtual Provincia? IdProvinciaNavigation { get; set; }

    public virtual Camion? IdCamionNavigation { get; set; }

    public virtual Localidad? IdLocalidadNavigation { get; set; }

    public virtual Partido? IdPartidoNavigation { get; set; }

    public virtual Semana IdSemanaRecoleccionNavigation { get; set; } = null!;

    public virtual User? IdUsuarioModificaNavigation { get; set; }

    public virtual User IdUsuarioRegistraNavigation { get; set; } = null!;
}
