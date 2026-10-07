/*
  036 — Listas de precio generales vs por producto.
  - ListasPrecios.IdProducto NULL = lista general (Configuraciones → todos los productos)
  - ListasPrecios.IdProducto = N  = lista exclusiva de ese producto
  Ejecutar manualmente en la base SistemaDB.
*/
SET NOCOUNT ON;
GO

IF COL_LENGTH(N'dbo.ListasPrecios', N'IdProducto') IS NULL
BEGIN
    ALTER TABLE dbo.ListasPrecios ADD IdProducto INT NULL;
    PRINT N'OK: ListasPrecios.IdProducto agregada.';
END
ELSE
    PRINT N'Skip: ListasPrecios.IdProducto ya existe.';
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = N'FK_ListasPrecios_Productos'
      AND parent_object_id = OBJECT_ID(N'dbo.ListasPrecios')
)
BEGIN
    ALTER TABLE dbo.ListasPrecios WITH CHECK
    ADD CONSTRAINT FK_ListasPrecios_Productos
        FOREIGN KEY (IdProducto) REFERENCES dbo.Productos (Id);
    PRINT N'OK: FK ListasPrecios → Productos.';
END
ELSE
    PRINT N'Skip: FK ListasPrecios → Productos ya existe.';
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_ListasPrecios_IdProducto'
      AND object_id = OBJECT_ID(N'dbo.ListasPrecios')
)
BEGIN
    CREATE INDEX IX_ListasPrecios_IdProducto ON dbo.ListasPrecios (IdProducto);
    PRINT N'OK: índice IX_ListasPrecios_IdProducto.';
END
ELSE
    PRINT N'Skip: índice IX_ListasPrecios_IdProducto ya existe.';
GO

PRINT N'036_ListasPrecios_IdProducto finalizado.';
GO
