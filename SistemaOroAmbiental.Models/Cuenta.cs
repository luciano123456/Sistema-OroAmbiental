using System;
using System.Collections.Generic;

namespace SistemaOroAmbiental.Models;

public partial class Cuenta
{
    public int Id { get; set; }

    public int IdSucursal { get; set; }

    public string Nombre { get; set; } = null!;

    public string TipoCuenta { get; set; } = "Efectivo";

    public virtual ICollection<CajasSaldo> CajasSaldos { get; set; } = new List<CajasSaldo>();

    public virtual ICollection<ClientesCobro> ClientesCobros { get; set; } = new List<ClientesCobro>();

    public virtual ICollection<Gasto> Gastos { get; set; } = new List<Gasto>();

    public virtual Sucursal IdSucursalNavigation { get; set; } = null!;

    public virtual ICollection<ProveedoresPago> ProveedoresPagos { get; set; } = new List<ProveedoresPago>();
}
