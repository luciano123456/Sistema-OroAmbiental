/*
  031 — Descripción de domicilio en establecimientos (entrecalles, referencias, etc.)
*/
SET NOCOUNT ON;

IF COL_LENGTH('dbo.ClientesEstablecimientos', 'Descripcion') IS NULL
    ALTER TABLE dbo.ClientesEstablecimientos ADD Descripcion VARCHAR(200) NULL;

GO

PRINT '031_ClientesEstablecimientosDescripcion.sql ejecutado.';
