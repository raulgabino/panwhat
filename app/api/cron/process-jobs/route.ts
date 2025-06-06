import { kv } from "@vercel/kv"
import { NextResponse } from "next/server"

interface Message {
  timestamp: Date
  sender: string
  content: string
  isClient: boolean
}

interface ProductCount {
  [key: string]: number
}

interface ClientAnalysis {
  name: string
  totalOrders: number
  totalPieces: number
  avgPiecesPerOrder: number
  messagesPerOrder: number
  responseTimeHours: number
  difficultyScore: number
  lastOrderDate: Date
  preferredProducts: Array<{ product: string; count: number; percentage: number }>
  orderPatterns: string[]
  paymentIssues: number
  noResponseDays: number
  orderFrequency: number
  totalSpent: number
  avgOrderValue: number
  satisfactionScore: number
  complaints: number
  compliments: number
  specificOrders: number
  generalOrders: number
  specificPieces: number
  generalPieces: number
  totalCambios: number
  totalPedidosGenerales: number
  totalPedidosEspecificos: number
  subDestinations: Array<{ destination: string; orders: number; pieces: number }>
  exclusions: string[]
  segment?: string
  churnRisk?: string
}

interface OrderData {
  date: string
  client: string
  products: string
  totalPieces: number
  orderType: string
  orderCategory: "General (Surtido)" | "Específico (Complacencia)" | "Mixto"
  responseTime: number
  estimatedValue: number
  dayOfWeek: string
  hour: number
  destination?: string
  cambios?: number
  packageFormat?: string
  detailedProducts?: Array<{ product: string; quantity: number }>
}

interface GPTAnalysis {
  insights: string[]
  recommendations: string[]
  riskLevel: "low" | "medium" | "high"
  behaviorProfile: string
  communicationStyle: string
  businessValue: string
  predictedActions: string[]
  satisfactionAnalysis: string
  customerProfile: string
  keyPreferences: string[]
  keyExclusions: string[]
  nextBestAction: string
  significantEvents: string[]
}

interface ConversationContext {
  lastClientSender: string | null
  lastBakeryMessageTime: Date | null
  clientStates: Map<
    string,
    {
      lastBakeryMessage: Date | null
      awaitingResponse: boolean
      totalMessages: number
      responseTimes: number[]
    }
  >
}

interface ConversationTag {
  type: string
  content: string
  timestamp: Date
}

async function analyzeWithGPT(
  clientData: ClientAnalysis,
  messages: string[],
  orderHistory: OrderData[],
): Promise<GPTAnalysis> {
  try {
    const context = {
      clientName: clientData.name,
      totalOrders: clientData.totalOrders,
      totalSpent: clientData.totalSpent,
      avgOrderValue: clientData.avgOrderValue,
      responseTime: clientData.responseTimeHours,
      paymentIssues: clientData.paymentIssues,
      complaints: clientData.complaints,
      compliments: clientData.compliments,
      orderFrequency: clientData.orderFrequency,
      preferredProducts: clientData.preferredProducts.slice(0, 5),
      recentMessages: messages.slice(-10),
      orderTrends: orderHistory.slice(-5),
      totalCambios: clientData.totalCambios,
      pedidosGenerales: clientData.totalPedidosGenerales,
      pedidosEspecificos: clientData.totalPedidosEspecificos,
      subDestinations: clientData.subDestinations,
      exclusions: clientData.exclusions,
      allMessages: messages,
    }

    const prompt = `
Analiza COMPLETAMENTE este cliente de panadería considerando toda su historia de conversación y comportamiento:

CLIENTE: ${context.clientName}
MÉTRICAS CLAVE:
- Pedidos: ${context.totalOrders} | Gastado: $${context.totalSpent?.toLocaleString()} | Promedio: $${context.avgOrderValue?.toLocaleString()}
- Frecuencia: ${context.orderFrequency}/semana | Respuesta: ${context.responseTime}h
- Problemas pago: ${context.paymentIssues} | Quejas: ${context.complaints} | Elogios: ${context.compliments}
- Top productos: ${context.preferredProducts.map((p) => `${p.product}(${p.percentage}%)`).join(", ")}

ANÁLISIS DE COMPORTAMIENTO:
- Pedidos Generales (Surtido): ${context.pedidosGenerales}
- Pedidos Específicos (Complacencia): ${context.pedidosEspecificos}
- Total de Cambios Solicitados: ${context.totalCambios}
- Destinos Múltiples: ${context.subDestinations?.map((d) => `${d.destination}(${d.orders} pedidos)`).join(", ") || "Ninguno"}
- Exclusiones Detectadas: ${context.exclusions?.join(", ") || "Ninguna"}

CONVERSACIÓN COMPLETA: ${context.allMessages.join(" | ")}

PEDIDOS RECIENTES: ${context.orderTrends.map((o) => `${o.date}:${o.products}(${o.totalPieces}pzs,$${o.estimatedValue},${o.orderCategory})`).join(" | ")}

INSTRUCCIONES ESPECÍFICAS:
Analiza toda la conversación para entender el comportamiento, preferencias, problemas y oportunidades. 
Identifica eventos significativos como quejas, problemas de entrega, solicitudes especiales, etc.

Responde EXACTAMENTE en este formato JSON:
{
  "insights": ["insight1", "insight2", "insight3"],
  "recommendations": ["recomendación1", "recomendación2"],
  "riskLevel": "low|medium|high",
  "behaviorProfile": "perfil en 1 línea",
  "communicationStyle": "estilo en 1 línea",
  "businessValue": "valor en 1 línea",
  "predictedActions": ["predicción1", "predicción2"],
  "satisfactionAnalysis": "análisis en 1 línea",
  "customerProfile": "resumen de 1-2 líneas del comportamiento completo del cliente",
  "keyPreferences": ["producto1", "producto2", "producto3"],
  "keyExclusions": ["producto_rechazado1", "producto_rechazado2"],
  "nextBestAction": "una recomendación específica y concreta para el próximo contacto",
  "significantEvents": ["EVENTO1", "EVENTO2"]
}

EVENTOS POSIBLES: QUEJA_CALIDAD, PROBLEMA_ENTREGA, SOLICITUD_ESPECIAL, PAGO_PENDIENTE, NUEVO_CLIENTE, CLIENTE_FRECUENTE, PEDIDO_URGENTE, CAMBIO_PATRON, SATISFACCION_ALTA, RIESGO_ABANDONO

ENFOQUE:
1. Analiza patrones de comportamiento únicos
2. Identifica preferencias específicas y exclusiones
3. Detecta eventos significativos en la conversación
4. Proporciona acción específica y práctica
5. Considera el contexto completo del negocio de panadería
`

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Eres un consultor experto en análisis de clientes para panaderías con 15+ años de experiencia. Entiendes perfectamente los patrones de pedidos, preferencias de productos, problemas operacionales y comportamiento de clientes. Analizas conversaciones completas para extraer insights profundos y accionables. Responde SOLO en formato JSON válido, sin texto adicional.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 1200,
      }),
    })

    if (!response.ok) {
      console.warn(`GPT API error: ${response.status}`)
      return createFallbackAnalysis(clientData)
    }

    const data = await response.json()
    const gptResponse = data.choices[0]?.message?.content

    if (!gptResponse) {
      console.warn("No response from GPT")
      return createFallbackAnalysis(clientData)
    }

    try {
      const cleanResponse = gptResponse.replace(/```json|```/g, "").trim()
      const analysis = JSON.parse(cleanResponse)

      const requiredFields = [
        "insights",
        "recommendations",
        "riskLevel",
        "customerProfile",
        "keyPreferences",
        "keyExclusions",
        "nextBestAction",
        "significantEvents",
      ]

      for (const field of requiredFields) {
        if (!analysis[field]) {
          throw new Error(`Missing required field: ${field}`)
        }
      }

      return analysis
    } catch (parseError) {
      console.warn("GPT response was not valid JSON:", parseError)
      return createFallbackAnalysis(clientData)
    }
  } catch (error) {
    console.error("Error with GPT analysis:", error)
    return createFallbackAnalysis(clientData)
  }
}

function createFallbackAnalysis(clientData: ClientAnalysis): GPTAnalysis {
  const insights = []
  const recommendations = []
  let riskLevel: "low" | "medium" | "high" = "low"

  const riskScore =
    clientData.difficultyScore * 2 +
    clientData.paymentIssues * 3 +
    (clientData.complaints > clientData.compliments ? 2 : 0) +
    (clientData.responseTimeHours > 6 ? 2 : 0) +
    (clientData.orderFrequency < 1 ? 1 : 0)

  if (riskScore >= 8) {
    riskLevel = "high"
    insights.push("Cliente de alto riesgo: múltiples factores problemáticos detectados")
    recommendations.push("Implementar seguimiento semanal y protocolo de atención especial")
  } else if (riskScore >= 4) {
    riskLevel = "medium"
    insights.push("Cliente con complejidad moderada que requiere atención")
    recommendations.push("Monitorear mensualmente y mejorar comunicación")
  } else {
    insights.push("Cliente estable con comportamiento predecible")
    recommendations.push("Mantener nivel de servicio actual")
  }

  if (clientData.totalCambios > 5) {
    insights.push("Cliente con alta frecuencia de cambios - posible insatisfacción")
    recommendations.push("Consultar preferencias específicas para reducir cambios")
  }

  const keyPreferences = clientData.preferredProducts.slice(0, 3).map((p) => p.product)
  const significantEvents = []

  if (clientData.totalOrders < 3) significantEvents.push("NUEVO_CLIENTE")
  if (clientData.orderFrequency > 4) significantEvents.push("CLIENTE_FRECUENTE")
  if (clientData.paymentIssues > 0) significantEvents.push("PAGO_PENDIENTE")
  if (clientData.complaints > clientData.compliments) significantEvents.push("QUEJA_CALIDAD")
  if (clientData.satisfactionScore > 2) significantEvents.push("SATISFACCION_ALTA")

  return {
    insights,
    recommendations,
    riskLevel,
    behaviorProfile: `Cliente ${riskLevel === "high" ? "complejo" : riskLevel === "medium" ? "moderado" : "estable"} con ${clientData.totalPedidosGenerales > clientData.totalPedidosEspecificos ? "preferencia por surtido" : "pedidos específicos"}`,
    communicationStyle:
      clientData.responseTimeHours > 4 ? "Comunicación lenta pero consistente" : "Comunicación eficiente y directa",
    businessValue:
      clientData.totalSpent > 100000
        ? "Muy alto valor"
        : clientData.totalSpent > 50000
          ? "Alto valor"
          : clientData.totalSpent > 20000
            ? "Valor medio"
            : "Valor básico",
    predictedActions: [
      clientData.orderFrequency > 3 ? "Continuará con pedidos regulares" : "Pedidos esporádicos",
      clientData.satisfactionScore > 0 ? "Mantendrá relación comercial" : "Riesgo de abandono",
    ],
    satisfactionAnalysis:
      clientData.satisfactionScore > 2
        ? "Cliente muy satisfecho, baja probabilidad de abandono"
        : clientData.satisfactionScore > 0
          ? "Cliente satisfecho con el servicio"
          : "Cliente con insatisfacciones que requieren atención inmediata",
    customerProfile: `Cliente ${clientData.orderFrequency > 3 ? "frecuente" : "ocasional"} que ${clientData.totalPedidosGenerales > clientData.totalPedidosEspecificos ? "confía en el surtido de la panadería" : "tiene preferencias específicas"}. ${clientData.totalCambios > 3 ? "Solicita cambios regularmente." : "Generalmente satisfecho con los pedidos."}`,
    keyPreferences: keyPreferences.length > 0 ? keyPreferences : ["surtido variado"],
    keyExclusions: clientData.exclusions || [],
    nextBestAction:
      clientData.totalCambios > 5
        ? "Consultar preferencias específicas antes del próximo pedido"
        : clientData.orderFrequency < 1
          ? "Contactar para reactivar con oferta especial"
          : "Mantener comunicación regular y confirmar disponibilidad",
    significantEvents,
  }
}

// Función completa de análisis restaurada
async function analyzeConversations(conversations: string, isAccumulative = false, totalConversations = 1) {
  const messages = parseWhatsAppConversations(conversations)

  if (messages.length === 0) {
    throw new Error("No se pudieron reconocer mensajes válidos en el texto")
  }

  const clients = new Map<string, ClientAnalysis>()
  const products = new Map<string, number>()
  const hourlyTrends = new Array(24).fill(0)
  const dailyTrends = new Array(7).fill(0)
  const monthlyTrends = new Array(12).fill(0)
  const ordersData: OrderData[] = []
  const conversationTags: ConversationTag[] = []

  let totalOrders = 0
  let totalRevenue = 0
  let totalSpecificOrders = 0
  let totalGeneralOrders = 0
  let totalSpecificPieces = 0
  let totalGeneralPieces = 0
  const totalCambios = 0

  const context: ConversationContext = {
    lastClientSender: null,
    lastBakeryMessageTime: null,
    clientStates: new Map(),
  }

  const productPatterns = {
    "conchas blancas": {
      regex: /\b(?:conchas?|conchitas?)\s*(?:blancas?|blanquitas?)?\b/gi,
      estimatedPrice: 800,
    },
    "panes largos": {
      regex: /\b(?:panes?|panecitos?)\s*(?:largos?|larguitos?)?\b/gi,
      estimatedPrice: 1000,
    },
    armadillos: {
      regex: /\b(?:armadillos?|armadillitos?)\b/gi,
      estimatedPrice: 900,
    },
    pastelitos: {
      regex: /\b(?:pastelitos?|pasteles?|pastelillos?)\b/gi,
      estimatedPrice: 1200,
    },
    donas: {
      regex: /\b(?:donas?|donitas?|donutas?)\b/gi,
      estimatedPrice: 1100,
    },
    bisquete: {
      regex: /\b(?:bisquetes?|bisquetitos?|biskets?|bisquets?)\b/gi,
      estimatedPrice: 700,
    },
    roles: {
      regex: /\b(?:roles?|rolitos?|rollitos?)\b/gi,
      estimatedPrice: 800,
    },
    ojos: {
      regex: /\b(?:ojos?|ojitos?)\b/gi,
      estimatedPrice: 900,
    },
    hojaldrado: {
      regex: /\b(?:hojaldrados?|hojaldraditos?)\b/gi,
      estimatedPrice: 1000,
    },
    tostados: {
      regex: /\b(?:tostados?|tostaditos?)\b/gi,
      estimatedPrice: 1100,
    },
    "pan blanco": {
      regex: /\b(?:panes?)\s*(?:blancos?|blanquitos?)\b/gi,
      estimatedPrice: 600,
    },
    surtidas: {
      regex: /\b(?:piezas?\s*)?(?:surtidas?|surtiditas?|variadas?)\b/gi,
      estimatedPrice: 850,
    },
  }

  // Función para convertir números en texto a números
  const textToNumber = (text: string): number => {
    const numberMap: { [key: string]: number } = {
      uno: 1,
      una: 1,
      dos: 2,
      tres: 3,
      cuatro: 4,
      cinco: 5,
      seis: 6,
      siete: 7,
      ocho: 8,
      nueve: 9,
      diez: 10,
      once: 11,
      doce: 12,
      trece: 13,
      catorce: 14,
      quince: 15,
      veinte: 20,
      treinta: 30,
      cuarenta: 40,
      cincuenta: 50,
      cien: 100,
    }
    const lowerText = text.toLowerCase()
    return numberMap[lowerText] || Number.parseInt(text) || 0
  }

  // Función para extraer números de un texto
  const extractNumbers = (text: string): number[] => {
    const numbers: number[] = []
    const digitMatches = text.match(/\b\d+\b/g)
    if (digitMatches) {
      numbers.push(...digitMatches.map(Number))
    }
    const words = text.toLowerCase().split(/\s+/)
    for (const word of words) {
      const num = textToNumber(word)
      if (num > 0) {
        numbers.push(num)
      }
    }
    return numbers
  }

  // Procesar mensajes cronológicamente
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i]

    hourlyTrends[message.timestamp.getHours()]++
    dailyTrends[message.timestamp.getDay()]++
    monthlyTrends[message.timestamp.getMonth()]++

    if (message.isClient) {
      context.lastClientSender = message.sender

      if (!clients.has(message.sender)) {
        clients.set(message.sender, {
          name: message.sender,
          totalOrders: 0,
          totalPieces: 0,
          avgPiecesPerOrder: 0,
          messagesPerOrder: 0,
          responseTimeHours: 0,
          difficultyScore: 0,
          lastOrderDate: new Date(0),
          preferredProducts: [],
          orderPatterns: [],
          paymentIssues: 0,
          noResponseDays: 0,
          orderFrequency: 0,
          totalSpent: 0,
          avgOrderValue: 0,
          satisfactionScore: 0,
          complaints: 0,
          compliments: 0,
          specificOrders: 0,
          generalOrders: 0,
          specificPieces: 0,
          generalPieces: 0,
          totalCambios: 0,
          totalPedidosGenerales: 0,
          totalPedidosEspecificos: 0,
          subDestinations: [],
          exclusions: [],
        })
      }

      if (!context.clientStates.has(message.sender)) {
        context.clientStates.set(message.sender, {
          lastBakeryMessage: null,
          awaitingResponse: false,
          totalMessages: 0,
          responseTimes: [],
        })
      }

      const clientAnalysis = clients.get(message.sender)!
      const clientState = context.clientStates.get(message.sender)!

      clientState.totalMessages++

      // Calcular tiempo de respuesta
      if (clientState.awaitingResponse && clientState.lastBakeryMessage) {
        const responseTimeMs = message.timestamp.getTime() - clientState.lastBakeryMessage.getTime()
        const responseTimeHours = responseTimeMs / (1000 * 60 * 60)

        if (responseTimeHours < 24) {
          clientState.responseTimes.push(responseTimeHours)
        }

        clientState.awaitingResponse = false
      }

      const messageContent = message.content.toLowerCase()

      // Detectar indicadores de satisfacción
      const positiveWords = ["gracias", "perfecto", "excelente", "bueno", "ok", "bien", "genial", "súper", "rico"]
      const negativeWords = [
        "problema",
        "mal",
        "error",
        "queja",
        "reclamo",
        "demora",
        "tarde",
        "feo",
        "horrible",
        "duro",
        "viejo",
      ]

      if (positiveWords.some((word) => messageContent.includes(word))) {
        clientAnalysis.compliments++
      }
      if (negativeWords.some((word) => messageContent.includes(word))) {
        clientAnalysis.complaints++
      }

      // Detectar problemas de pago
      if (
        messageContent.includes("pago") ||
        messageContent.includes("mañana lo pago") ||
        messageContent.includes("no lo pague") ||
        messageContent.includes("después pago") ||
        messageContent.includes("luego pago") ||
        messageContent.includes("debo")
      ) {
        clientAnalysis.paymentIssues++
      }

      // Analizar pedidos
      const numbers = extractNumbers(message.content)

      if (numbers.length > 0) {
        const orderPieces = numbers.reduce((sum, num) => sum + num, 0)
        let orderValue = 0
        const detectedProducts: string[] = []

        // Detectar productos específicos
        let hasSpecificProducts = false
        Object.entries(productPatterns).forEach(([productName, pattern]) => {
          if (pattern.regex.test(message.content)) {
            hasSpecificProducts = true
            const productCount = Math.floor(orderPieces / Object.keys(productPatterns).length) || 1

            const existingProduct = clientAnalysis.preferredProducts.find((p) => p.product === productName)
            if (existingProduct) {
              existingProduct.count += productCount
            } else {
              clientAnalysis.preferredProducts.push({ product: productName, count: productCount, percentage: 0 })
            }

            products.set(productName, (products.get(productName) || 0) + productCount)
            detectedProducts.push(`${productCount} ${productName}`)
            orderValue += productCount * pattern.estimatedPrice
          }
        })

        const orderCategory = hasSpecificProducts ? "Específico (Complacencia)" : "General (Surtido)"

        if (orderCategory === "Específico (Complacencia)") {
          clientAnalysis.specificOrders++
          clientAnalysis.specificPieces += orderPieces
          clientAnalysis.totalPedidosEspecificos++
          totalSpecificOrders++
          totalSpecificPieces += orderPieces
        } else {
          clientAnalysis.generalOrders++
          clientAnalysis.generalPieces += orderPieces
          clientAnalysis.totalPedidosGenerales++
          totalGeneralOrders++
          totalGeneralPieces += orderPieces
          detectedProducts.push(`${orderPieces} piezas surtidas`)
          orderValue = orderPieces * 850
        }

        if (orderValue === 0 && orderPieces > 0) {
          orderValue = orderPieces * 850
        }

        // Registrar el pedido
        clientAnalysis.totalOrders++
        clientAnalysis.totalPieces += orderPieces
        totalOrders++

        clientAnalysis.totalSpent += orderValue
        totalRevenue += orderValue

        if (message.timestamp > clientAnalysis.lastOrderDate) {
          clientAnalysis.lastOrderDate = message.timestamp
        }

        // Crear registro de pedido
        const orderRecord: OrderData = {
          date: message.timestamp.toLocaleDateString(),
          client: message.sender,
          products: detectedProducts.join(", ") || `${orderPieces} piezas`,
          totalPieces: orderPieces,
          orderType: orderPieces >= 25 ? "Grande" : orderPieces >= 15 ? "Mediano" : "Pequeño",
          orderCategory,
          responseTime:
            clientState.responseTimes.length > 0 ? clientState.responseTimes[clientState.responseTimes.length - 1] : 0,
          estimatedValue: orderValue,
          dayOfWeek: message.timestamp.toLocaleDateString("es-ES", { weekday: "long" }),
          hour: message.timestamp.getHours(),
        }

        ordersData.push(orderRecord)
      }
    } else {
      // Mensaje de la panadería
      if (context.lastClientSender) {
        const clientState = context.clientStates.get(context.lastClientSender)
        if (clientState) {
          clientState.lastBakeryMessage = message.timestamp
          clientState.awaitingResponse = true
        }
      }
    }
  }

  // Calcular métricas finales para cada cliente con análisis GPT
  const clientAnalysisPromises = Array.from(clients.entries()).map(async ([clientName, analysis]) => {
    const clientState = context.clientStates.get(clientName)

    // Calcular métricas finales
    analysis.avgPiecesPerOrder = analysis.totalOrders > 0 ? analysis.totalPieces / analysis.totalOrders : 0
    analysis.avgOrderValue = analysis.totalOrders > 0 ? analysis.totalSpent / analysis.totalOrders : 0
    analysis.satisfactionScore = analysis.compliments - analysis.complaints

    if (clientState) {
      analysis.messagesPerOrder =
        analysis.totalOrders > 0 ? clientState.totalMessages / analysis.totalOrders : clientState.totalMessages

      if (clientState.responseTimes.length > 0) {
        analysis.responseTimeHours =
          clientState.responseTimes.reduce((sum, time) => sum + time, 0) / clientState.responseTimes.length
      }
    }

    // Calcular frecuencia de pedidos
    const orderDates = ordersData
      .filter((order) => order.client === clientName)
      .map((order) => new Date(order.date))
      .sort((a, b) => a.getTime() - b.getTime())

    if (orderDates.length > 1) {
      const firstOrder = orderDates[0]
      const lastOrder = orderDates[orderDates.length - 1]
      const daysDiff = (lastOrder.getTime() - firstOrder.getTime()) / (1000 * 60 * 60 * 24)
      analysis.orderFrequency = daysDiff > 0 ? (analysis.totalOrders / daysDiff) * 7 : 0
    }

    // Calcular porcentajes de productos preferidos
    const totalProductCount = analysis.preferredProducts.reduce((sum, p) => sum + p.count, 0)
    analysis.preferredProducts = analysis.preferredProducts
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((product) => ({
        ...product,
        percentage: totalProductCount > 0 ? Math.round((product.count / totalProductCount) * 100) : 0,
      }))

    // Calcular puntuación de dificultad
    analysis.difficultyScore =
      (analysis.messagesPerOrder > 2 ? 1 : 0) +
      (analysis.responseTimeHours > 4 ? 2 : 0) +
      analysis.paymentIssues * 3 +
      (analysis.noResponseDays > 3 ? 2 : 0) +
      (analysis.orderFrequency < 1 ? 1 : 0) +
      (analysis.complaints > analysis.compliments ? 2 : 0)

    // Implementar segmentación de clientes
    const today = new Date()
    const daysSinceLastOrder = Math.floor((today.getTime() - analysis.lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))

    if (analysis.orderFrequency > 3 && analysis.totalSpent > 50000) {
      analysis.segment = "VIP"
    } else if (daysSinceLastOrder > 15 || analysis.satisfactionScore < 0) {
      analysis.segment = "En Riesgo"
    } else if (analysis.totalOrders < 3) {
      analysis.segment = "Nuevo"
    } else {
      analysis.segment = "Regular"
    }

    // Calcular nivel de riesgo de abandono
    let riskScore = 0
    if (daysSinceLastOrder > 20) riskScore += 3
    if (analysis.difficultyScore > 4) riskScore += 2
    if (analysis.satisfactionScore < 0) riskScore += 2
    riskScore += analysis.paymentIssues * 3

    if (riskScore >= 5) {
      analysis.churnRisk = "Alto"
    } else if (riskScore >= 3) {
      analysis.churnRisk = "Medio"
    } else {
      analysis.churnRisk = "Bajo"
    }

    // Analizar con GPT
    let gptAnalysis: GPTAnalysis | null = null
    if (process.env.OPENAI_API_KEY && analysis.totalOrders > 0) {
      try {
        const clientMessages = messages.filter((m) => m.isClient && m.sender === clientName).map((m) => m.content)
        const clientOrders = ordersData.filter((order) => order.client === clientName)
        gptAnalysis = await analyzeWithGPT(analysis, clientMessages, clientOrders)
      } catch (error) {
        console.error(`Error analyzing client ${clientName} with GPT:`, error)
        gptAnalysis = createFallbackAnalysis(analysis)
      }
    } else {
      gptAnalysis = createFallbackAnalysis(analysis)
    }

    return { analysis, gptAnalysis }
  })

  // Esperar a que se completen todos los análisis
  const clientResults = await Promise.all(clientAnalysisPromises)

  // Preparar datos finales
  const clientsData = clientResults.map(({ analysis, gptAnalysis }) => ({
    "Nombre Cliente": analysis.name,
    "Total Pedidos": analysis.totalOrders,
    "Pedidos Específicos": analysis.specificOrders,
    "Pedidos Generales": analysis.generalOrders,
    "Total Piezas": analysis.totalPieces,
    "Piezas Específicas": analysis.specificPieces,
    "Piezas Generales": analysis.generalPieces,
    "Total Gastado": analysis.totalSpent,
    "Valor Promedio Pedido": Math.round(analysis.avgOrderValue),
    "Promedio Piezas/Pedido": Math.round(analysis.avgPiecesPerOrder * 10) / 10,
    "Mensajes por Pedido": Math.round(analysis.messagesPerOrder * 10) / 10,
    "Tiempo Respuesta (hrs)": Math.round(analysis.responseTimeHours * 10) / 10,
    "Puntuación Dificultad": analysis.difficultyScore,
    "Último Pedido": analysis.lastOrderDate.toLocaleDateString(),
    "Productos Preferidos": analysis.preferredProducts.map((p) => `${p.product} (${p.count})`).join(", "),
    "Productos Detallados": analysis.preferredProducts,
    Patrones: analysis.orderPatterns.join(", "),
    "Problemas Pago": analysis.paymentIssues,
    "Días Sin Pedido": analysis.noResponseDays,
    "Frecuencia Semanal": Math.round(analysis.orderFrequency * 10) / 10,
    "Puntuación Satisfacción": analysis.satisfactionScore,
    "Nivel de Riesgo": gptAnalysis?.riskLevel || "low",
    "Perfil de Comportamiento": gptAnalysis?.behaviorProfile || "Análisis en proceso",
    "Valor para Negocio": gptAnalysis?.businessValue || "Evaluando",
    "Análisis Satisfacción": gptAnalysis?.satisfactionAnalysis || "Pendiente",
    "Insights GPT": gptAnalysis?.insights || [],
    "Recomendaciones GPT": gptAnalysis?.recommendations || [],
    Predicciones: gptAnalysis?.predictedActions || [],
    Segmento: analysis.segment,
    "Riesgo de Abandono": analysis.churnRisk,
    "Total Pedidos Generales": analysis.totalPedidosGenerales,
    "Total Pedidos Específicos": analysis.totalPedidosEspecificos,
    "Total Cambios": analysis.totalCambios,
    "Destinos Múltiples": analysis.subDestinations
      .map((d) => `${d.destination} (${d.orders} pedidos, ${d.pieces} piezas)`)
      .join(", "),
    Exclusiones: analysis.exclusions.join(", "),
    "Perfil de Cliente": gptAnalysis?.customerProfile || "Análisis en proceso",
    "Preferencias Clave": gptAnalysis?.keyPreferences || [],
    "Exclusiones Clave": gptAnalysis?.keyExclusions || [],
    "Próxima Mejor Acción": gptAnalysis?.nextBestAction || "Pendiente",
    "Eventos Significativos": gptAnalysis?.significantEvents || [],
  }))

  const productsData = Array.from(products.entries()).map(([product, count]) => ({
    Producto: product,
    "Total Pedidos": count,
    Popularidad: count > 50 ? "Muy Alta" : count > 20 ? "Alta" : count > 10 ? "Media" : "Baja",
  }))

  const trendsData = [
    ...hourlyTrends.map((count, hour) => ({
      Tipo: "Hora",
      Periodo: `${hour}:00`,
      Actividad: count,
    })),
    ...dailyTrends.map((count, day) => ({
      Tipo: "Día Semana",
      Periodo: ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][day],
      Actividad: count,
    })),
    ...monthlyTrends.map((count, month) => ({
      Tipo: "Mes",
      Periodo: [
        "Enero",
        "Febrero",
        "Marzo",
        "Abril",
        "Mayo",
        "Junio",
        "Julio",
        "Agosto",
        "Septiembre",
        "Octubre",
        "Noviembre",
        "Diciembre",
      ][month],
      Actividad: count,
    })),
  ]

  const ordersExportData = ordersData.map((order) => ({
    Fecha: order.date,
    Cliente: order.client,
    Productos: order.products,
    "Total Piezas": order.totalPieces,
    "Tipo Pedido": order.orderType,
    "Categoría Pedido": order.orderCategory,
    "Tiempo Respuesta (hrs)": order.responseTime,
    "Valor Estimado": order.estimatedValue,
    "Día de la Semana": order.dayOfWeek,
    Hora: order.hour,
    Destino: order.destination || "Principal",
    Cambios: order.cambios || 0,
    "Formato Paquete": order.packageFormat || "N/A",
    "Productos Detallados": order.detailedProducts
      ? order.detailedProducts.map((p) => `${p.quantity} ${p.product}`).join(", ")
      : "N/A",
  }))

  // Calcular estadísticas
  const segmentStats = {
    VIP: clientsData.filter((client) => client["Segmento"] === "VIP").length,
    "En Riesgo": clientsData.filter((client) => client["Segmento"] === "En Riesgo").length,
    Nuevo: clientsData.filter((client) => client["Segmento"] === "Nuevo").length,
    Regular: clientsData.filter((client) => client["Segmento"] === "Regular").length,
  }

  const churnRiskStats = {
    Alto: clientsData.filter((client) => client["Riesgo de Abandono"] === "Alto").length,
    Medio: clientsData.filter((client) => client["Riesgo de Abandono"] === "Medio").length,
    Bajo: clientsData.filter((client) => client["Riesgo de Abandono"] === "Bajo").length,
  }

  return {
    totalClients: clients.size,
    totalOrders,
    totalSpecificOrders,
    totalGeneralOrders,
    totalPieces: Array.from(clients.values()).reduce((sum, client) => sum + client.totalPieces, 0),
    totalSpecificPieces,
    totalGeneralPieces,
    totalCambios,
    totalRevenue: Array.from(clients.values()).reduce((sum, client) => sum + client.totalSpent, 0),
    avgResponseTime:
      Math.round(
        (Array.from(clients.values()).reduce((sum, client) => sum + client.responseTimeHours, 0) / clients.size) * 10,
      ) / 10,
    clientsData: clientsData.sort((a, b) => b["Total Gastado"] - a["Total Gastado"]),
    productsData: productsData.sort((a, b) => b["Total Pedidos"] - a["Total Pedidos"]),
    trendsData,
    ordersData: ordersExportData,
    conversationTags,
    isAccumulative,
    totalConversationsProcessed: totalConversations,
    segmentStats,
    churnRiskStats,
  }
}

function parseWhatsAppConversations(text: string): Message[] {
  const messages: Message[] = []
  const lines = text.split("\n")

  const whatsappRegex =
    /^\[(\d{1,2}:\d{2}(?:\s*(?:[ap]\.?m\.?|AM|PM))?),\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\]\s*([^:]+):\s*(.*)$/i

  for (const line of lines) {
    const trimmedLine = line.trim()
    if (!trimmedLine) continue

    const match = trimmedLine.match(whatsappRegex)
    if (match) {
      const [, time, date, sender, content] = match

      try {
        const [datePart1, datePart2, year] = date.split("/").map(Number)
        let month: number, day: number, fullYear: number

        if (datePart1 > 12) {
          day = datePart1
          month = datePart2
        } else if (datePart2 > 12) {
          month = datePart1
          day = datePart2
        } else {
          day = datePart1
          month = datePart2
        }

        fullYear = year < 100 ? (year > 50 ? 1900 + year : 2000 + year) : year

        let adjustedHour: number, minute: number

        const timeMatch = time.match(/(\d{1,2}):(\d{2})(?:\s*([ap])\.?m\.?)?/i)
        if (timeMatch) {
          const [, hourStr, minStr, period] = timeMatch
          const hour = Number.parseInt(hourStr)
          minute = Number.parseInt(minStr)

          if (period) {
            adjustedHour = hour
            if (period.toLowerCase() === "p" && hour !== 12) adjustedHour += 12
            if (period.toLowerCase() === "a" && hour === 12) adjustedHour = 0
          } else {
            adjustedHour = hour
          }
        } else {
          const [hour, min] = time.split(":").map(Number)
          adjustedHour = hour
          minute = min
        }

        const timestamp = new Date(fullYear, month - 1, day, adjustedHour, minute)

        if (isNaN(timestamp.getTime())) {
          console.warn(`Invalid timestamp for line: ${line}`)
          continue
        }

        const isClient = !sender.toLowerCase().includes("panaderia quilantan")

        messages.push({
          timestamp,
          sender: sender.trim(),
          content: content.trim(),
          isClient,
        })
      } catch (error) {
        console.warn(`Error parsing line: ${line}`, error)
        continue
      }
    }
  }

  return messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
}

export async function GET() {
  try {
    console.log("Cron job started: Processing pending jobs...")

    const pendingJobs = ((await kv.get("pending_jobs")) as string[]) || []

    if (pendingJobs.length === 0) {
      console.log("No pending jobs found")
      return NextResponse.json({ message: "No pending jobs" })
    }

    const jobId = pendingJobs[0]
    console.log(`Processing job: ${jobId}`)

    await kv.set(`job:status:${jobId}`, {
      status: "processing",
      startedAt: new Date().toISOString(),
    })

    const updatedPendingJobs = pendingJobs.slice(1)
    await kv.set("pending_jobs", updatedPendingJobs)

    try {
      const jobData = (await kv.get(`job:data:${jobId}`)) as any

      if (!jobData) {
        throw new Error("Job data not found")
      }

      console.log(`Analyzing conversations for job ${jobId}...`)

      const analysisResult = await analyzeConversations(
        jobData.conversations,
        jobData.isAccumulative,
        jobData.totalConversations,
      )

      console.log(`Analysis completed for job ${jobId}`)

      await kv.set(`job:result:${jobId}`, analysisResult)

      await kv.set(`job:status:${jobId}`, {
        status: "completed",
        completedAt: new Date().toISOString(),
      })

      await kv.del(`job:data:${jobId}`)

      console.log(`Job ${jobId} completed successfully`)

      return NextResponse.json({
        message: "Job processed successfully",
        jobId,
        status: "completed",
      })
    } catch (analysisError) {
      console.error(`Error processing job ${jobId}:`, analysisError)

      await kv.set(`job:status:${jobId}`, {
        status: "failed",
        error: analysisError instanceof Error ? analysisError.message : "Unknown error",
        failedAt: new Date().toISOString(),
      })

      await kv.del(`job:data:${jobId}`)

      return NextResponse.json(
        {
          message: "Job failed",
          jobId,
          status: "failed",
          error: analysisError instanceof Error ? analysisError.message : "Unknown error",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error in cron job:", error)
    return NextResponse.json(
      {
        error: "Cron job failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
