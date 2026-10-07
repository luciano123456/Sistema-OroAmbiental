-- Origen del cobro: Cliente vs pago de terceros (el pagador es opcional).
IF COL_LENGTH('dbo.ClientesCobros', 'EsPagoTercero') IS NULL
BEGIN
    ALTER TABLE dbo.ClientesCobros ADD EsPagoTercero BIT NOT NULL
        CONSTRAINT DF_ClientesCobros_EsPagoTercero DEFAULT (0);
END
GO

IF COL_LENGTH('dbo.ClientesCobros', 'IdTercero') IS NOT NULL
   AND COL_LENGTH('dbo.ClientesCobros', 'EsPagoTercero') IS NOT NULL
BEGIN
    UPDATE dbo.ClientesCobros
    SET EsPagoTercero = 1
    WHERE IdTercero IS NOT NULL AND EsPagoTercero = 0;
END
GO
