/*
  013 — Lista / tipo de pago en líneas de entrega.
  - ClientesEntregasProductos.IdListaPrecio
  - ClientesEntregasProductosRecuperados.IdListaPrecio
  Ejecutar manualmente en la base SistemaDB.
*/
SET NOCOUNT ON;
GO

IF COL_LENGTH(N'dbo.ClientesEntregasProductos', N'IdListaPrecio') IS NULL
BEGIN
    ALTER TABLE dbo.ClientesEntregasProductos ADD IdListaPrecio INT NULL;
    PRINT N'OK: ClientesEntregasProductos.IdListaPrecio agregada.';
END
ELSE
    PRINT N'Skip: ClientesEntregasProductos.IdListaPrecio ya existe.';
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = N'FK_ClientesEntregasProductos_ListasPrecios'
      AND parent_object_id = OBJECT_ID(N'dbo.ClientesEntregasProductos')
)
BEGIN
    ALTER TABLE dbo.ClientesEntregasProductos WITH CHECK
    ADD CONSTRAINT FK_ClientesEntregasProductos_ListasPrecios
        FOREIGN KEY (IdListaPrecio) REFERENCES dbo.ListasPrecios (Id);
    PRINT N'OK: FK ClientesEntregasProductos → ListasPrecios.';
END
ELSE
    PRINT N'Skip: FK ClientesEntregasProductos → ListasPrecios ya existe.';
GO

IF COL_LENGTH(N'dbo.ClientesEntregasProductosRecuperados', N'IdListaPrecio') IS NULL
BEGIN
    ALTER TABLE dbo.ClientesEntregasProductosRecuperados ADD IdListaPrecio INT NULL;
    PRINT N'OK: ClientesEntregasProductosRecuperados.IdListaPrecio agregada.';
END
ELSE
    PRINT N'Skip: ClientesEntregasProductosRecuperados.IdListaPrecio ya existe.';
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = N'FK_CEPR_ListasPrecios'
      AND parent_object_id = OBJECT_ID(N'dbo.ClientesEntregasProductosRecuperados')
)
BEGIN
    ALTER TABLE dbo.ClientesEntregasProductosRecuperados WITH CHECK
    ADD CONSTRAINT FK_CEPR_ListasPrecios
        FOREIGN KEY (IdListaPrecio) REFERENCES dbo.ListasPrecios (Id);
    PRINT N'OK: FK CEPR → ListasPrecios.';
END
ELSE
    PRINT N'Skip: FK CEPR → ListasPrecios ya existe.';
GO

PRINT N'013_EntregasProductosIdListaPrecio finalizado.';
GO
