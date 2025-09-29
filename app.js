const { createBot, createProvider, createFlow, addKeyword } = require('@bot-whatsapp/bot');
const QRPortalWeb = require('@bot-whatsapp/portal');
const BaileysProvider = require('@bot-whatsapp/provider/baileys');
const MockAdapter = require('@bot-whatsapp/database/mock');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// 🔁 Delay configurable por el usuario
let delayMs = 25000; // valor por defecto en milisegundos (25 segundos)

// ✅ Leer archivo Excel con campos personalizados
const leerMensajesDesdeExcel = () => {
    const rutaArchivo = path.join(__dirname, 'mensajes.xlsx');
    const workbook = XLSX.readFile(rutaArchivo);
    const hoja = workbook.Sheets[workbook.SheetNames[0]];
    const datos = XLSX.utils.sheet_to_json(hoja);

    return datos
        .filter(item => item.to)
        .map(item => {
            const numero = `57${String(item.to).trim()}@s.whatsapp.net`;

            const text = item.text ? String(item.text).trim() : null;
            let url = item.url ? String(item.url).trim() : null;
            if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
                url = `https://${url}`;
            }

            const buildPath = (value) => {
                return value ? path.join(__dirname, String(value).trim()) : null;
            };

            return {
                to: numero,
                text,
                url,
                imagePath: buildPath(item.imagePath),
                videoPath: buildPath(item.videoPath),
                audioPath: buildPath(item.audioPath),
                filePath: buildPath(item.filePath)
            };
        });
};

// ✅ Flujo principal con resumen y control de delay
const flowPrincipal = addKeyword(['3nv1ar', '3j3cut4r', 'c0rr3r', '1n1c14r'])
    .addAnswer('⏱️ ¿Cuántos segundos deseas de espera entre mensajes? (Ej: 10)', { capture: true })
    .addAction(async (ctx, { flowDynamic, provider }) => {
        const input = ctx.body.trim();
        const segundos = parseInt(input);

        if (!isNaN(segundos) && segundos >= 1) {
            delayMs = segundos * 1000;
            await flowDynamic(`✅ Delay configurado a ${segundos} segundos.`);
        } else {
            await flowDynamic('❌ Valor inválido. Usando el delay por defecto de 25 segundos.');
            delayMs = 25000;
        }

        const mensajes = leerMensajesDesdeExcel();
        const totalDestinatarios = mensajes.length;
        const delaySegundos = delayMs / 1000;
        const tiempoEstimadoTotal = totalDestinatarios * delaySegundos;

        const resumen = `📋 Se enviarán mensajes a ${totalDestinatarios} destinatario(s), con ${delaySegundos} segundos de espera entre cada uno.\n🕒 Tiempo estimado total: ${tiempoEstimadoTotal} segundos (~${Math.ceil(tiempoEstimadoTotal / 60)} minuto(s))`;

        console.log('==================== RESUMEN ====================');
        console.log(`🧾 Total destinatarios: ${totalDestinatarios}`);
        console.log(`⏱️ Delay configurado: ${delaySegundos} segundos`);
        console.log(`🕒 Tiempo estimado total: ${tiempoEstimadoTotal} segundos`);
        console.log('=================================================');

        await flowDynamic(resumen);

        let contador = 1;

        for (const mensaje of mensajes) {
            const { to, text, url, imagePath, videoPath, audioPath, filePath } = mensaje;

            console.log(`\n📤 [${contador}/${totalDestinatarios}] Enviando a ${to}`);

            try {
                if (imagePath && fs.existsSync(imagePath)) {
                    await provider.sendImage(to, imagePath, '');
                    console.log('🖼️ Imagen enviada');
                }

                if (videoPath && fs.existsSync(videoPath)) {
                    await provider.sendVideo(to, videoPath, '');
                    console.log('🎥 Video enviado');
                }

                if (audioPath && fs.existsSync(audioPath)) {
                    await provider.sendAudio(to, audioPath);
                    console.log('🔊 Audio enviado');
                }

                if (filePath && fs.existsSync(filePath)) {
                    const nombreArchivo = path.basename(filePath);
                    await provider.sendFile(to, filePath, nombreArchivo, '📎 Archivo adjunto');
                    console.log('📎 Archivo enviado');
                }

                if (text) {
                    await provider.sendText(to, text);
                    console.log('💬 Texto enviado');
                }

                if (url) {
                    await provider.sendText(to, url);
                    console.log('🔗 URL enviada');
                }

                console.log(`⏱️ Esperando ${delaySegundos} segundos...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));

            } catch (error) {
                console.error(`❌ Error enviando a ${to}:`, error.message);
            }

            contador++;
        }

        console.log('\n✅ Todos los mensajes fueron enviados.');
        await flowDynamic('✅ Todos los mensajes han sido enviados correctamente.');
    });

// ✅ Inicialización del bot
const main = async () => {
    const adapterDB = new MockAdapter();
    const adapterFlow = createFlow([flowPrincipal]);
    const adapterProvider = createProvider(BaileysProvider);

    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    });

    QRPortalWeb(); // Genera QR para conectar con WhatsApp
};

main();
