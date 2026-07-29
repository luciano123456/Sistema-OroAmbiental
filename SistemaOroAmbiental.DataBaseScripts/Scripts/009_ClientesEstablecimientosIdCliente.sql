/*
  009 — Id establecimiento ingresado por el usuario (max 8 caracteres).
  Ejecutar manualmente en la base SistemaDB.
*/
SET NOCOUNT ON;
GO

IF COL_LENGTH('dbo.ClientesEstablecimientos', 'IdEstablecimientoCliente') IS NULL
    ALTER TABLE dbo.ClientesEstablecimientos ADD IdEstablecimientoCliente VARCHAR(8) NULL;
GO

PRINT '009_ClientesEstablecimientosIdCliente.sql ejecutado correctamente.';
