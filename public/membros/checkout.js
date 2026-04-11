(function () {
    "use strict";

    function inicializarCheckout() {
        var sessao = SessaoServico.exigirAutenticacao("membro", "../index.html");
        if (!sessao) return null;

        var $ = UIServico.$;
        var form = $("#checkoutForm");
        var estadoInicial = $("#estadoInicial");
        var painelPix = $("#qrcodeResult");
        var painelCartao = $("#cartaoResult");
        var qrImage = $("#qrImage");
        var qrData = $("#qrData");
        var statusPagamento = $("#statusPagamento");
        var btnCopiar = $("#btnCopiar");
        var btnAtualizarStatus = $("#btnAtualizarStatus");
        var ultimoPreferenceId = null;

        function esconderResultados() {
            estadoInicial.classList.add("hidden");
            painelPix.classList.add("hidden");
            painelCartao.classList.add("hidden");
        }

        function mostrarPix(dados) {
            esconderResultados();
            painelPix.classList.remove("hidden");
            qrImage.src = dados.qr_code ? "data:image/png;base64," + dados.qr_code : "../favicon.svg";
            qrData.textContent = dados.qr_data || dados.checkout_url || "QR Code indisponível";
            atualizarStatusVisual("pendente");
        }

        function mostrarCartao() {
            esconderResultados();
            painelCartao.classList.remove("hidden");
        }

        function atualizarStatusVisual(status) {
            if (!statusPagamento) return;
            var texto = "Aguardando pagamento";
            statusPagamento.className = "status-pill";

            if (status === "confirmado") {
                texto = "Pagamento confirmado";
                statusPagamento.classList.add("status-pill--confirmado");
            } else if (status === "recusado") {
                texto = "Pagamento recusado";
            } else if (status === "pendente_confirmacao") {
                texto = "Pagamento em análise";
            }

            statusPagamento.textContent = texto;
        }

        async function atualizarStatus() {
            if (!ultimoPreferenceId) return null;

            var dados = await ApiServico.obterStatusPagamento(ultimoPreferenceId);
            atualizarStatusVisual(dados.status);

            if (dados.status === "confirmado") {
                UIServico.mostrarToast("Pagamento confirmado com sucesso.", "success");
            }

            return dados;
        }

        if (btnAtualizarStatus) {
            btnAtualizarStatus.addEventListener("click", function () {
                atualizarStatus().catch(function (erro) {
                    UIServico.mostrarToast(erro.message || "Não foi possível atualizar o status.", "error");
                });
            });
        }

        if (btnCopiar) {
            btnCopiar.addEventListener("click", function () {
                if (!navigator.clipboard) {
                    UIServico.mostrarToast("Clipboard indisponível neste navegador.", "error");
                    return;
                }

                navigator.clipboard.writeText(qrData.textContent || "").then(function () {
                    UIServico.mostrarToast("Código Pix copiado.", "success");
                }).catch(function () {
                    UIServico.mostrarToast("Não foi possível copiar o código Pix.", "error");
                });
            });
        }

        form.addEventListener("submit", async function (evento) {
            evento.preventDefault();

            var valor = Number($("#valor").value);
            var tipoSelecionado = document.querySelector('input[name="tipo"]:checked');
            var tipo = tipoSelecionado ? tipoSelecionado.value : "pix_qr_code";
            var descricao = ($("#descricao").value || "").trim();

            if (!valor || valor <= 0) {
                UIServico.mostrarToast("Informe um valor válido para contribuir.", "error");
                return;
            }

            try {
                var dados = await ApiServico.criarPreferenciaPagamento({
                    valor: valor,
                    tipo: tipo,
                    descricao: descricao || "Contribuição online",
                });

                ultimoPreferenceId = dados.preference_id;

                if (tipo === "cartao_credito") {
                    mostrarCartao();
                    if (dados.checkout_url) {
                        window.location.href = dados.checkout_url;
                    }
                    return;
                }

                mostrarPix(dados);
            } catch (erro) {
                UIServico.mostrarToast(erro.message || "Erro ao gerar pagamento.", "error");
            }
        });

        return {
            atualizarStatusVisual: atualizarStatusVisual,
            atualizarStatus: atualizarStatus,
        };
    }

    window.CheckoutCongregaFiel = {
        init: inicializarCheckout,
    };

    window.CheckoutCongregaFiel.modulo = inicializarCheckout();
})();
