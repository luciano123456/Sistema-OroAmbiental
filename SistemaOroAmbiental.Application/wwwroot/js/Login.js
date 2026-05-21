$(document).ready(function () {

    /* =============================
       OJO VER PASSWORD
    ============================== */

    $("#togglePassword").on("click", function () {

        const input = $("#password");
        const icon = $(this).find("i");

        if (input.attr("type") === "password") {

            input.attr("type", "text");
            icon.removeClass("fa-eye").addClass("fa-eye-slash");

        }
        else {

            input.attr("type", "password");
            icon.removeClass("fa-eye-slash").addClass("fa-eye");

        }

    });

    /* =============================
       RECORDAR USUARIO
    ============================== */

    if (localStorage.getItem("rememberMe") === "true") {

        $("#username").val(localStorage.getItem("username"));
        $("#password").val(localStorage.getItem("password"));

        $("#rememberMe").prop("checked", true);

    }

    /* =============================
       LOGIN
    ============================== */

    $("#loginForm").on("submit", function (e) {

        e.preventDefault();

        const username = $("#username").val();
        const password = $("#password").val();

        const token = $('input[name="__RequestVerificationToken"]').val();

        const rememberMe = $("#rememberMe").prop("checked");

        fetch(loginUrl, {

            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "RequestVerificationToken": token
            },

            body: JSON.stringify({
                Usuario: username,
                Contrasena: password
            })

        })
            .then(async r => {

                const data = await r.json();

                if (!r.ok)
                    throw data;

                return data;

            })
            .then(data => {

                if (!data.success)
                    throw data;

                localStorage.setItem("JwtToken", data.token);
                localStorage.setItem("userSession", JSON.stringify(data.user));

                if (rememberMe) {

                    localStorage.setItem("username", username);
                    localStorage.setItem("password", password);
                    localStorage.setItem("rememberMe", true);

                }
                else {

                    localStorage.removeItem("username");
                    localStorage.removeItem("password");
                    localStorage.removeItem("rememberMe");

                }

                window.location.href = "Dashboard";

            })
            .catch(err => {

                const mensaje =
                    err?.message ||
                    err?.Message ||
                    "Usuario o contraseña incorrectos.";

                $("#errorMessage").text(mensaje);

                $("#diverrorMessage")
                    .stop(true, true)
                    .fadeIn();

                setTimeout(() => {

                    $("#diverrorMessage").fadeOut();

                }, 3000);

            });

    });

});