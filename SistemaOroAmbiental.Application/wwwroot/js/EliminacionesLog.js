(function () {
    const token = window.token || localStorage.getItem("JwtToken") || "";
    const $search = $("#elSearch");
    const $entidad = $("#elEntidad");
    const $desde = $("#elDesde");
    const $hasta = $("#elHasta");
    const $empty = $("#elEmpty");
    const $tableWrap = $("#elTableWrap");

    let tipoFiltro = "";
    let rawRows = [];

    function esc(s) {
        return String(s ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function initials(name) {
        const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
        if (!parts.length) return "?";
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    function tipoClass(code) {
        if (code === "cascada") return "el-chip--cascada";
        if (code === "desvincular") return "el-chip--desvincular";
        return "el-chip--simple";
    }

    function tipoCorto(code, fallback) {
        if (code === "cascada") return "Cascada";
        if (code === "desvincular") return "Desvincular";
        if (code === "simple") return "Simple";
        return fallback || "Simple";
    }

    function tipoCodeDe(row) {
        const raw = String(row?.TipoCode || row?.tipoCode || row?.Tipo || "").trim().toLowerCase();
        if (raw.includes("desvincular")) return "desvincular";
        if (raw === "cascada" || raw.includes("borrar asociados") || raw.includes("cascada")) return "cascada";
        if (raw === "simple" || !raw) return "simple";
        return raw;
    }

    function humanizarEntidad(v) {
        const raw = String(v || "").trim();
        const map = {
            "el producto": "Producto",
            "el producto del establecimiento": "Producto de establecimiento",
            "el cliente": "Cliente",
            "el contrato": "Contrato",
            "el establecimiento": "Establecimiento",
            "el proveedor": "Proveedor",
            "el chofer": "Chofer",
            "el gasto": "Gasto",
            "la compra": "Compra",
            "la entrega": "Entrega",
            "el usuario": "Usuario",
            "la firma": "Firma",
            "la sucursal": "Sucursal"
        };
        return map[raw.toLowerCase()] || raw;
    }

    function formatearIp(v) {
        let ip = String(v || "").trim().replace(/^\[|\]$/g, "");
        if (ip.toLowerCase().startsWith("::ffff:")) ip = ip.slice(7);
        if (ip === "::1" || ip === ":1" || ip === "0:0:0:0:0:0:0:1" || ip === "127.0.0.1") return "localhost";
        return ip;
    }

    function parseIso(iso) {
        if (!iso) return null;
        const d = new Date(iso);
        return isNaN(d.getTime()) ? null : d;
    }

    function actualizarKpis(rows) {
        const total = rows.length;
        const simple = rows.filter(r => tipoCodeDe(r) === "simple").length;
        const cascada = rows.filter(r => tipoCodeDe(r) === "cascada").length;
        const desv = rows.filter(r => tipoCodeDe(r) === "desvincular").length;
        $("#kpiTotal").text(total);
        $("#kpiSimple").text(simple);
        $("#kpiCascada").text(cascada);
        $("#kpiDesvincular").text(desv);
    }

    function llenarEntidades(rows) {
        const actual = $entidad.val();
        const set = [...new Set(rows.map(r => r.Entidad).filter(Boolean))].sort((a, b) =>
            String(a).localeCompare(String(b), "es"));
        $entidad.empty().append('<option value="">Todas</option>');
        set.forEach(e => $entidad.append($("<option>").val(e).text(e)));
        if (actual && set.includes(actual)) $entidad.val(actual);
    }

    function toggleEmpty(rows) {
        const empty = !rows.length;
        $empty.prop("hidden", !empty);
        $tableWrap.toggleClass("d-none", empty);
    }

    const tabla = $("#grdEliminacionesLog").DataTable({
        ajax: {
            url: "/EliminacionesLog/Lista",
            dataSrc: function (json) {
                rawRows = Array.isArray(json) ? json : [];
                actualizarKpis(rawRows);
                llenarEntidades(rawRows);
                toggleEmpty(rawRows);
                return rawRows;
            },
            error: function () {
                rawRows = [];
                actualizarKpis(rawRows);
                llenarEntidades(rawRows);
                toggleEmpty(rawRows);
            },
            headers: { Authorization: "Bearer " + token }
        },
        dom: '<"el-dt-top"l>t<"el-dt-bottom"ip>',
        columns: [
            {
                data: "Fecha",
                render: function (_, type, row) {
                    if (type === "sort" || type === "type") return row.FechaIso || row.Fecha || "";
                    return `<div class="el-date"><span class="el-date-d">${esc(row.FechaDia || row.Fecha)}</span><span class="el-date-t">${esc(row.FechaHora || "")}</span></div>`;
                }
            },
            {
                data: "UsuarioNombre",
                defaultContent: "",
                render: function (v) {
                    const name = v || "Sistema";
                    return `<div class="el-user"><span class="el-avatar">${esc(initials(name))}</span><span class="el-user-name">${esc(name)}</span></div>`;
                }
            },
            {
                data: "Entidad",
                render: function (v) {
                    return `<span class="el-chip el-chip--ent">${esc(humanizarEntidad(v) || "—")}</span>`;
                }
            },
            {
                data: "NombreEntidad",
                defaultContent: "",
                render: function (v, _, row) {
                    const name = v || "Sin nombre";
                    const id = row.IdEntidad != null ? `#${row.IdEntidad}` : "";
                    return `<div class="el-reg"><span class="el-reg-name" title="${esc(name)}">${esc(name)}</span><span class="el-reg-id">${esc(id)}</span></div>`;
                }
            },
            {
                data: "Tipo",
                render: function (v, _, row) {
                    const code = tipoCodeDe(row);
                    const full = v || tipoCorto(code);
                    return `<span class="el-chip el-chip--tipo ${tipoClass(code)}" title="${esc(full)}">${esc(tipoCorto(code, v))}</span>`;
                }
            },
            {
                data: "Detalle",
                defaultContent: "",
                render: function (v, _, row) {
                    const txt = (v || "").trim();
                    if (!txt) return `<span class="text-white-50">—</span>`;
                    return `<div class="el-detalle"><span class="el-detalle-txt" title="${esc(txt)}">${esc(txt)}</span><button type="button" class="el-detalle-btn" data-id="${esc(row.Id)}" title="Ver detalle"><i class="fa fa-expand"></i></button></div>`;
                }
            },
            {
                data: "Ip",
                defaultContent: "",
                render: function (v) {
                    return `<span class="el-ip">${esc(formatearIp(v) || "—")}</span>`;
                }
            }
        ],
        order: [[0, "desc"]],
        pageLength: 25,
        scrollX: true,
        autoWidth: false,
        language: { url: "https://cdn.datatables.net/plug-ins/1.11.5/i18n/es-ES.json" },
        drawCallback: function () {
            if (tabla) tabla.columns.adjust();
        }
    });

    $.fn.dataTable.ext.search.push(function (settings, _data, dataIndex) {
        if (settings.nTable.id !== "grdEliminacionesLog") return true;
        const row = tabla.row(dataIndex).data();
        if (!row) return true;
        if (tipoFiltro && tipoCodeDe(row) !== tipoFiltro) return false;
        const ent = $entidad.val();
        if (ent && row.Entidad !== ent) return false;
        const d = parseIso(row.FechaIso);
        const desde = $desde.val();
        const hasta = $hasta.val();
        if (d && desde) {
            const a = new Date(desde + "T00:00:00");
            if (d < a) return false;
        }
        if (d && hasta) {
            const b = new Date(hasta + "T23:59:59");
            if (d > b) return false;
        }
        return true;
    });

    function aplicarFiltros() {
        tabla.draw();
        const vis = tabla.rows({ search: "applied" }).count();
        if (!rawRows.length) {
            $empty.prop("hidden", false);
            $empty.find("h3").text("Todavia no hay eliminaciones");
            $empty.find("p").text("Cuando alguien borre un registro, aca vas a ver fecha, usuario, entidad y si arrastro datos en cascada.");
            $tableWrap.addClass("d-none");
            return;
        }
        if (!vis) {
            $empty.prop("hidden", false);
            $empty.find("h3").text("Sin coincidencias");
            $empty.find("p").text("Proba otro filtro o limpia la busqueda para volver a ver el historial.");
            $tableWrap.addClass("d-none");
            return;
        }
        $empty.prop("hidden", true);
        $tableWrap.removeClass("d-none");
        tabla.columns.adjust();
    }

    $search.on("input", function () {
        tabla.search(this.value).draw();
        aplicarFiltros();
    });

    $entidad.add($desde).add($hasta).on("change", aplicarFiltros);

    $("#elKpis").on("click", ".el-kpi", function () {
        $("#elKpis .el-kpi").removeClass("is-active");
        $(this).addClass("is-active");
        tipoFiltro = $(this).data("tipo") || "";
        aplicarFiltros();
    });

    $("#elLimpiarFiltros").on("click", function () {
        $search.val("");
        $entidad.val("");
        $desde.val("");
        $hasta.val("");
        tipoFiltro = "";
        $("#elKpis .el-kpi").removeClass("is-active");
        $("#elKpis .el-kpi[data-tipo='']").addClass("is-active");
        tabla.search("").draw();
        aplicarFiltros();
    });

    $("#btnRefreshEliminacionesLog").on("click", function () {
        const $btn = $(this);
        $btn.prop("disabled", true);
        tabla.ajax.reload(function () {
            $btn.prop("disabled", false);
            aplicarFiltros();
        }, false);
    });

    $("#grdEliminacionesLog").on("click", ".el-detalle-btn", function () {
        const id = Number($(this).data("id"));
        const row = rawRows.find(r => r.Id === id) || tabla.row($(this).closest("tr")).data();
        if (!row) return;
        $("#elDetalleTitulo").text(row.NombreEntidad || row.Entidad || "Detalle");
        $("#elDetalleSub").text(`${row.Fecha || ""} · ${row.UsuarioNombre || "Sistema"} · ${row.Tipo || ""}`);
        $("#elDetalleBody").text(row.Detalle || "Sin detalle adicional.");
        const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById("elDetalleModal"));
        modal.show();
    });
})();
