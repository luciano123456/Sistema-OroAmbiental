/*
  021 — Flag "producto no retirado" en líneas de entrega.
  - ClientesEntregasProductos.NoRetirado (bit, default 0)
  Solo aplica a TipoMovimiento = Retiro (2). Marca que se intentó el retiro
  pero el producto no se retiró; se acumula aparte en el control mensual.
  Ejecutar manualmente en la base SistemaDB.
*/
SET NOCOUNT ON;
GO

IF COL_LENGTH(N'dbo.ClientesEntregasProductos', N'NoRetirado') IS NULL
BEGIN
    ALTER TABLE dbo.ClientesEntregasProductos
        ADD NoRetirado BIT NOT NULL
            CONSTRAINT DF_ClientesEntregasProductos_NoRetirado DEFAULT (0);
    PRINT N'OK: ClientesEntregasProductos.NoRetirado agregada.';
END
ELSE
    PRINT N'Skip: ClientesEntregasProductos.NoRetirado ya existe.';
GO

PRINT N'021_EntregasProductosNoRetirado finalizado.';
GO
