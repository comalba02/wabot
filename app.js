const { createBot, createProvider, createFlow, addKeyword } = require('@bot-whatsapp/bot')
const QRPortalWeb = require('@bot-whatsapp/portal')
const BaileysProvider = require('@bot-whatsapp/provider/baileys')
const MockAdapter = require('@bot-whatsapp/database/mock')
const XLSX = require('xlsx')
const path = require('path')
const fs = require('fs')

/**
 * ⏱️ Delay entre mensajes
 */
const DELAY_MS = 25000

/**
 * ✅ Leer archivo Excel con campos personalizados
 */
const leerMensajesDesdeExcel = () => {
    const rutaArchivo = path.join(__dirname, 'mensajes.xlsx')
    const workbook = XLSX.readFile(rutaArchivo)
    const hoja = workbook.Sheets[workbook.SheetNames[0]]
    const datos = XLSX.utils.sheet_to_json(hoja)

    return datos
        .filter(item => item.to) // Solo validar que haya número
        .map(item => {
            const numero = `57${String(item.to).trim()}@s.whatsapp.net`

            const text = item.text ? String(item.text).trim() : null
            let url = item.url ? String(item.url).trim() : null
            if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
                url = `https://${url}`
            }

            // Construir rutas absolutas si existen
            const buildPath = (value) => {
                return value ? path.join(__dirname, String(value).trim()) : null
            }

            return {
                to: numero,
                text,
                url,
                imagePath: buildPath(item.imagePath),
                videoPath: buildPath(item.videoPath),
                audioPath: buildPath(item.audioPath),
                filePath: buildPath(item.filePath)
            }
        })
}

/**
 * ✅ Flujo principal
 */
const flowPrincipal = addKeyword(['3nv1ar', '3j3cut4r', 'c0rr3r', '1n1c14r'])
    .addAnswer('✅ Iniciando reenvío de mensajes desde Excel...')
    .addAction(
        async (ctx, { provider }) => {
            const mensajes = leerMensajesDesdeExcel()

            for (const mensaje of mensajes) {
                const { to, text, url, imagePath, videoPath, audioPath, filePath } = mensaje

                console.log(`📤 Enviando a ${to}`)

                try {
                    // Imagen
                    if (imagePath && fs.existsSync(imagePath)) {
                        await provider.sendImage(to, imagePath, '')
                        console.log('🖼️ Imagen enviada')
                    }

                    // Video
                    if (videoPath && fs.existsSync(videoPath)) {
                        await provider.sendVideo(to, videoPath, '')
                        console.log('🎥 Video enviado')
                    }

                    // Audio
                    if (audioPath && fs.existsSync(audioPath)) {
                        await provider.sendAudio(to, audioPath)
                        console.log('🔊 Audio enviado')
                    }

                    // Archivo
                    if (filePath && fs.existsSync(filePath)) {
                        const nombreArchivo = path.basename(filePath)
                        await provider.sendFile(to, filePath, nombreArchivo, '📎 Archivo adjunto')
                        console.log('📎 Archivo enviado')
                    }

                    // Texto
                    if (text) {
                        await provider.sendText(to, text)
                        console.log('💬 Texto enviado')
                    }

                    // URL
                    if (url) {
                        await provider.sendText(to, url)
                        console.log('🔗 URL enviada')
                    }

                    console.log(`⏱️ Esperando ${DELAY_MS / 1000} segundos...`)
                    await new Promise(resolve => setTimeout(resolve, DELAY_MS))

                } catch (error) {
                    console.error(`❌ Error enviando a ${to}:`, error.message)
                }
            }

            console.log('✅ Todos los mensajes fueron enviados.')
        }
    )

/**
 * ✅ Inicialización del bot
 */
const main = async () => {
    const adapterDB = new MockAdapter()
    const adapterFlow = createFlow([flowPrincipal])
    const adapterProvider = createProvider(BaileysProvider)

    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })

    QRPortalWeb()
}

main()
