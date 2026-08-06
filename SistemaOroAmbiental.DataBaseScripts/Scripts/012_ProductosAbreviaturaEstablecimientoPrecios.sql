/*
  012 — Abreviatura de productos + precios por producto en establecimientos.
  - Productos.Abreviatura
  - ClientesEstablecimientosProductos.IdListaPrecio / PrecioVenta
  - ClientesEstablecimientos.IdListaPrecio pasa a nullable (la lista queda por producto)
  Ejecutar manualmente en la base SistemaDB.
*/
SET NOCOUNT ON;
GO

IF COL_LENGTH(N'dbo.Productos', N'Abreviatura') IS NULL
BEGIN
    ALTER TABLE dbo.Productos ADD Abreviatura VARCHAR(20) NULL;
    PRINT N'OK: Productos.Abreviatura agregada.';
END
ELSE
    PRINT N'Skip: Productos.Abreviatura ya existe.';
GO

IF COL_LENGTH(N'dbo.ClientesEstablecimientosProductos', N'IdListaPrecio') IS NULL
BEGIN
    ALTER TABLE dbo.ClientesEstablecimientosProductos ADD IdListaPrecio INT NULL;
    PRINT N'OK: ClientesEstablecimientosProductos.IdListaPrecio agregada.';
END
ELSE
    PRINT N'Skip: ClientesEstablecimientosProductos.IdListaPrecio ya existe.';
GO

IF COL_LENGTH(N'dbo.ClientesEstablecimientosProductos', N'PrecioVenta') IS NULL
BEGIN
    ALTER TABLE dbo.ClientesEstablecimientosProductos ADD PrecioVenta DECIMAL(18, 2) NOT NULL CONSTRAINT DF_CEP_PrecioVenta DEFAULT (0);
    PRINT N'OK: ClientesEstablecimientosProductos.PrecioVenta agregada.';
END
ELSE
    PRINT N'Skip: ClientesEstablecimientosProductos.PrecioVenta ya existe.';
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = N'FK_ClientesEstablecimientosProductos_ListasPrecios'
      AND parent_object_id = OBJECT_ID(N'dbo.ClientesEstablecimientosProductos')
)
BEGIN
    ALTER TABLE dbo.ClientesEstablecimientosProductos WITH CHECK
    ADD CONSTRAINT FK_ClientesEstablecimientosProductos_ListasPrecios
        FOREIGN KEY (IdListaPrecio) REFERENCES dbo.ListasPrecios (Id);
    PRINT N'OK: FK CEP → ListasPrecios.';
END
ELSE
    PRINT N'Skip: FK CEP → ListasPrecios ya existe.';
GO

-- IdListaPrecio del establecimiento: ya no obligatorio (lista por producto)
IF EXISTS (
    SELECT 1
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.ClientesEstablecimientos')
      AND c.name = N'IdListaPrecio'
      AND c.is_nullable = 0
)
BEGIN
    ALTER TABLE dbo.ClientesEstablecimientos ALTER COLUMN IdListaPrecio INT NULL;
    PRINT N'OK: ClientesEstablecimientos.IdListaPrecio ahora nullable.';
END
ELSE
    PRINT N'Skip: ClientesEstablecimientos.IdListaPrecio ya es nullable o no existe.';
GO

PRINT N'012_ProductosAbreviaturaEstablecimientoPrecios finalizado.';
GO
