/*
  022 — Marcas de descartador para hoja de ruta en Productos.
  - Productos.EsDescartadorChicoHojaRuta
  - Productos.EsDescartadorGrandeHojaRuta
  Ejecutar manualmente en la base SistemaDB.
*/
SET NOCOUNT ON;
GO

IF COL_LENGTH(N'dbo.Productos', N'EsDescartadorChicoHojaRuta') IS NULL
BEGIN
    ALTER TABLE dbo.Productos ADD EsDescartadorChicoHojaRuta BIT NOT NULL
        CONSTRAINT DF_Productos_EsDescartadorChicoHojaRuta DEFAULT (0);
    PRINT N'OK: Productos.EsDescartadorChicoHojaRuta agregada.';
END
ELSE
    PRINT N'Skip: Productos.EsDescartadorChicoHojaRuta ya existe.';
GO

IF COL_LENGTH(N'dbo.Productos', N'EsDescartadorGrandeHojaRuta') IS NULL
BEGIN
    ALTER TABLE dbo.Productos ADD EsDescartadorGrandeHojaRuta BIT NOT NULL
        CONSTRAINT DF_Productos_EsDescartadorGrandeHojaRuta DEFAULT (0);
    PRINT N'OK: Productos.EsDescartadorGrandeHojaRuta agregada.';
END
ELSE
    PRINT N'Skip: Productos.EsDescartadorGrandeHojaRuta ya existe.';
GO

PRINT N'022_ProductosDescartadorHojaRuta finalizado.';
GO
