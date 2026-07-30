/*
  010 — Tipo de cuenta (Efectivo / Banco) en Cuentas.
  Ejecutar manualmente en la base SistemaDB.
*/
SET NOCOUNT ON;
GO

IF COL_LENGTH('dbo.Cuentas', 'TipoCuenta') IS NULL
BEGIN
    ALTER TABLE dbo.Cuentas ADD TipoCuenta VARCHAR(20) NOT NULL
        CONSTRAINT DF_Cuentas_TipoCuenta DEFAULT 'Efectivo';
END
GO

UPDATE dbo.Cuentas
SET TipoCuenta = 'Efectivo'
WHERE TipoCuenta IS NULL OR LTRIM(RTRIM(TipoCuenta)) = '';
GO

UPDATE dbo.Cuentas
SET TipoCuenta = 'Banco'
WHERE TipoCuenta = 'Efectivo'
  AND (
        Nombre LIKE '%banco%'
     OR Nombre LIKE '%Banco%'
     OR Nombre LIKE '%BANCO%'
     OR Nombre LIKE '%cuenta corriente%'
     OR Nombre LIKE '%CC %'
  );
GO

PRINT '010_CuentasTipoCuenta.sql ejecutado correctamente.';
