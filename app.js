require('dotenv').config();

const MercadoLivreLinker = require('./mercadoLivreLinker');
const fs = require('fs');
const path = require('path');
const express = require('express');
const basicAuth = require('express-basic-auth');
const app = express();
const ShopeeGraphQLAPI = require('./shopee-afiliado');

// Inicialize o cliente Shopee com as credenciais
const shopeeClient = new ShopeeGraphQLAPI(
    process.env.SHOPEE_APP_ID,
    process.env.SHOPEE_APP_SECRET
);

// Middleware para processar JSON
app.use(express.json());

// Configuração do middleware de autenticação
app.use(basicAuth({
    users: { [process.env.BASIC_AUTH_USER]: process.env.BASIC_AUTH_PASSWORD },
    challenge: true
}));

// Rota para geração de links de afiliado Shopee
app.post('/shopee-afiliado', async (req, res) => {
    console.log('Recebendo solicitação para gerar link de afiliado Shopee:', req.body);
    try {
        const { productUrl, labels } = req.body;
        if (!productUrl) {
            return res.status(400).json({ 
                success: false, 
                error: 'URL do produto é obrigatória' 
            });
        }

        const subIds = labels || [];
        const result = await shopeeClient.generateShortLink(productUrl, subIds);

        if (result.error) {
            return res.status(result.status_code).json({
                success: false,
                error: result.message
            });
        }

        if (result.data && result.data.generateShortLink && result.data.generateShortLink.shortLink) {
            res.json({
                success: true,
                shortLink: result.data.generateShortLink.shortLink,
                originalUrl: productUrl,
                labels: subIds
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Formato de resposta inválido da API Shopee'
            });
        }

    } catch (error) {
        console.error('Erro ao gerar link de afiliado Shopee:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Rota para geração de links de afiliado do Mercado Livre
app.post('/ml-afiliado', async (req, res) => {
    console.log('Recebendo solicitação para gerar link de afiliado Mercado Livre:', req.body);
    const { productUrl, labels } = req.body;
    const COOKIES_PATH = path.join(__dirname, 'cookies.json');

    if (!productUrl) {
        return res.status(400).json({
            success: false,
            error: 'URL do produto é obrigatória'
        });
    }

    if (!fs.existsSync(COOKIES_PATH)) {
        console.error("Arquivo de cookies não encontrado. Exporte os cookies do Chrome primeiro.");
        return res.status(500).json({
            success: false,
            error: "Arquivo 'cookies.json' não encontrado no diretório do projeto."
        });
    }

    const linker = new MercadoLivreLinker(COOKIES_PATH);

    try {
        await linker.initialize();
        const generatedLinks = await linker.generateShareLink(productUrl, labels);

        if (generatedLinks) {
            console.log("Link do Mercado Livre gerado:", generatedLinks);
            return res.json({
                success: true,
                shortLink: generatedLinks,
                originalUrl: productUrl,
                labels: labels
            });
        } else {
            console.log("Falha ao gerar link do Mercado Livre.");
            return res.status(500).json({
                success: false,
                error: "Não foi possível gerar o link de afiliado do Mercado Livre."
            });
        }
    } catch (error) {
        console.error("Ocorreu um erro durante a geração do link do Mercado Livre:", error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        await linker.close();
    }
});

const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});