/*
  008 — Texto libre de dias y horarios en establecimientos.
  Ejecutar manualmente en la base SistemaDB.
*/
SET NOCOUNT ON;
GO

IF COL_LENGTH('dbo.ClientesEstablecimientos', 'DiasHorarios') IS NULL
    ALTER TABLE dbo.ClientesEstablecimientos ADD DiasHorarios NVARCHAR(1000) NULL;
GO

PRINT '008_ClientesEstablecimientosDiasHorarios.sql ejecutado correctamente.';
