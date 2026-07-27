namespace SistemaOroAmbiental.Application.Models.ViewModels
{
    public class VMUsuarioSucursalesUpdate
    {
        public int IdUsuario { get; set; }

        public List<int> IdsSucursales { get; set; } = new();
    }
}
