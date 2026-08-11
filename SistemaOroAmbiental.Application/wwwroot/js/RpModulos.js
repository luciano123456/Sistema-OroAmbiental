/**
 * Catálogo de módulos de navbar para presencia / heartbeat / Ir.
 */
(function (global) {
    const CATALOG = [
        {
            key: "Clientes",
            label: "Clientes",
            url: "/Clientes",
            prefixes: ["/clientes", "/clientesentregas"]
        },
        {
            key: "Productos",
            label: "Productos",
            url: "/Productos",
            prefixes: ["/productos", "/inventario", "/productosrecuperados"]
        },
        {
            key: "Transporte",
            label: "Transporte",
            url: "/Recorridos",
            prefixes: ["/camiones", "/recorridos"]
        },
        {
            key: "Proveedores",
            label: "Proveedores",
            url: "/Proveedores",
            prefixes: ["/proveedores", "/compras", "/proveedorescuentacorriente"]
        },
        {
            key: "Finanzas",
            label: "Finanzas",
            url: "/Finanzas",
            prefixes: ["/finanzas", "/caja", "/gastos", "/cuentas", "/bancos"]
        },
        {
            key: "AnalisisDatos",
            label: "Análisis de datos",
            url: "/AnalisisDatos",
            prefixes: ["/analisisdatos"]
        },
        {
            key: "Usuarios",
            label: "Usuarios",
            url: "/Usuarios",
            prefixes: ["/usuarios"]
        }
    ];

    function normalizePath(pathname) {
        return (pathname || "/")
            .toLowerCase()
            .replace(/\/+$/, "") || "/";
    }

    function fromPath(pathname) {
        const path = normalizePath(pathname);
        if (path === "/" || path.indexOf("/login") === 0) return null;

        for (let i = 0; i < CATALOG.length; i++) {
            const item = CATALOG[i];
            for (let j = 0; j < item.prefixes.length; j++) {
                const p = item.prefixes[j];
                if (path === p || path.startsWith(p + "/")) return item.key;
            }
        }
        return null;
    }

    function current() {
        return fromPath(global.location && global.location.pathname);
    }

    function find(key) {
        if (!key) return null;
        const k = String(key);
        return CATALOG.find(x => x.key.toLowerCase() === k.toLowerCase()) || null;
    }

    function label(key) {
        return find(key)?.label || key || "";
    }

    function url(key) {
        return find(key)?.url || null;
    }

    global.RpModulos = {
        CATALOG,
        fromPath,
        current,
        find,
        label,
        url
    };
})(window);
