const { createBot, createProvider, createFlow, addKeyword } = require('@bot-whatsapp/bot')
const QRPortalWeb = require('@bot-whatsapp/portal')
const BaileysProvider = require('@bot-whatsapp/provider/baileys')
const MockAdapter = require('@bot-whatsapp/database/mock')
const XLSX = require('xlsx')
const path = require('path')
const imagePath = path.join(__dirname, 'imagenes', 'imagen.jpg')
const videoPath = path.join(__dirname, 'videos', 'video.mp4')
const audioPath = path.join(__dirname, 'audios', 'audio.mp3')
const archivoPath = path.join(__dirname, 'archivos', 'archivo.pdf')

/**
 * ⏱️ Configura aquí el delay entre cada mensaje (en milisegundos)
 * Ejemplo:
 *  5000  = 5 segundos
 * 10000  = 10 segundos
 * 25000  = 25 segundos
 */
const DELAY_MS = 25000

/**
 * ✅ Lee el archivo Excel y retorna un array de mensajes con:
 * - Número destino formateado (con 57 y @s.whatsapp.net)
 * - Texto del mensaje
 * - URL verificada
 */
const leerMensajesDesdeExcel = () => {
    const rutaArchivo = path.join(__dirname, 'mensajes.xlsx')
    const workbook = XLSX.readFile(rutaArchivo)
    const hoja = workbook.Sheets[workbook.SheetNames[0]]
    const datos = XLSX.utils.sheet_to_json(hoja)

    return datos
        .filter(item => item.to && item.text && item.url) // Validar filas completas
        .map(item => {
            const numero = String(item.to).trim()
            const numeroCompleto = `57${numero}@s.whatsapp.net`

            let url = String(item.url).trim()

            // Asegurar que la URL comience con http:// o https://
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = `https://${url}`
            }

            return {
                to: numeroCompleto,
                text: item.text.trim(),
                url
            }
        })
}

/**
 * ✅ Flujo principal del bot
 */
const flowPrincipal = addKeyword(['iniciar', 'ejecutar'])
    .addAnswer('✅ Iniciando reenvío de mensajes desde Excel...')
    .addAction(
        async (ctx, { provider }) => {
            const mensajes = leerMensajesDesdeExcel()

            for (const mensaje of mensajes) {
                const { to, text, url } = mensaje

                console.log(`📤 Enviando a ${to}`)
                console.log(`Texto: ${text}`)
                console.log(`URL: ${url}`)

                try {
                    // Opcional para enviar imagenes
                    //await provider.sendImage(to, imagePath, '')

                    // Opcional para enviar videos
                    //await provider.sendVideo(to, videoPath, '')

                    // Opcional para enviar audios
                    //await provider.sendAudio(to, audioPath, '')

                    // Opcional para enviar archivos
                    //await provider.sendFile(to, archivoPath, '', '')

                    // 1. Enviar mensaje de texto
                    await provider.sendText(to, text)

                    // 2. Enviar URL como mensaje independiente
                    await provider.sendText(to, url)

                    // 3. Esperar el tiempo configurado (DELAY_MS)
                    console.log(`⏱️ Esperando ${DELAY_MS / 1000} segundos antes del siguiente mensaje...`)
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
