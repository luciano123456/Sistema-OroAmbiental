using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class ContratosDocumentosRepository : IContratosDocumentosRepository
    {
        private readonly SistemaOroAmbientalContext _db;

        public ContratosDocumentosRepository(SistemaOroAmbientalContext context)
        {
            _db = context;
        }

        public async Task<List<ContratosDocumento>> ListarPorContrato(int idContrato)
        {
            return await _db.ContratosDocumentos
                .AsNoTracking()
                .Include(x => x.IdUsuarioRegistraNavigation)
                .Include(x => x.IdTipoContratoNavigation)
                .Where(x => x.IdContrato == idContrato)
                .OrderByDescending(x => x.FechaUsuarioRegistra)
                .ThenByDescending(x => x.Id)
                .ToListAsync();
        }

        public async Task<ContratosDocumento?> Obtener(int id)
        {
            return await _db.ContratosDocumentos
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id);
        }

        public async Task<ContratosDocumento> Insertar(ContratosDocumento doc)
        {
            _db.ContratosDocumentos.Add(doc);
            await _db.SaveChangesAsync();
            return doc;
        }

        public async Task<bool> Eliminar(int id)
        {
            var entity = await _db.ContratosDocumentos.FindAsync(id);
            if (entity == null)
                return false;

            _db.ContratosDocumentos.Remove(entity);
            await _db.SaveChangesAsync();
            return true;
        }
    }
}
