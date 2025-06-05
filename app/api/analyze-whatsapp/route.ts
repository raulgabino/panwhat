import { type NextRequest, NextResponse } from "next/server"

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
  totalCambios: number // Nueva métrica para cambios
  totalPedidosGenerales: number // Nueva métrica
  totalPedidosEspecificos: number // Nueva métrica
  subDestinations: Array<{ destination: string; orders: number; pieces: number }> // Para destinos múltiples
  segment?: string
  churnRisk?: string
}

interface OrderData {
  date: string
  client: string
  products: string
  totalPieces: number
  orderType: string
  orderCategory: "General (Surtido)" | "Específico (Complacencia)"
  responseTime: number
  estimatedValue: number
  dayOfWeek: string
  hour: number
  destination?: string // Para pedidos con destinos específicos
  cambios?: number // Para rastrear cambios en el pedido
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
      preferredProducts: clientData.preferredProducts.slice(0, 3),
      recentMessages: messages.slice(-5),
      orderTrends: orderHistory.slice(-3),
      totalCambios: clientData.totalCambios,
      pedidosGenerales: clientData.totalPedidosGenerales,
      pedidosEspecificos: clientData.totalPedidosEspecificos,
      subDestinations: clientData.subDestinations,
    }

    const prompt = `
Analiza este cliente de panadería y proporciona insights accionables considerando el nuevo contexto de negocio:

CLIENTE: ${context.clientName}
MÉTRICAS CLAVE:
- Pedidos: ${context.totalOrders} | Gastado: $${context.totalSpent?.toLocaleString()} | Promedio: $${context.avgOrderValue?.toLocaleString()}
- Frecuencia: ${context.orderFrequency}/semana | Respuesta: ${context.responseTime}h
- Problemas pago: ${context.paymentIssues} | Quejas: ${context.complaints} | Elogios: ${context.compliments}
- Top productos: ${context.preferredProducts.map((p) => `${p.product}(${p.percentage}%)`).join(", ")}

ANÁLISIS DE COMPORTAMIENTO DE PEDIDOS:
- Pedidos Generales (Surtido): ${context.pedidosGenerales}
- Pedidos Específicos (Complacencia): ${context.pedidosEspecificos}
- Total de Cambios Solicitados: ${context.totalCambios}
- Destinos Múltiples: ${context.subDestinations?.map((d) => `${d.destination}(${d.orders} pedidos)`).join(", ") || "Ninguno"}

MENSAJES RECIENTES: ${context.recentMessages.join(" | ")}

PEDIDOS RECIENTES: ${context.orderTrends.map((o) => `${o.date}:${o.products}(${o.totalPieces}pzs,$${o.estimatedValue},${o.orderCategory})`).join(" | ")}

CONTEXTO DE NEGOCIO:
- Los pedidos "Generales" son surtido de productos variados (más común)
- Los pedidos "Específicos" son productos particulares solicitados por el cliente
- Los "cambios" indican modificaciones o devoluciones en pedidos
- Múltiples destinos sugieren que el cliente redistribuye productos

Responde en JSON:
{
  "insights": ["insight1", "insight2", "insight3"],
  "recommendations": ["recomendación1", "recomendación2"],
  "riskLevel": "low|medium|high",
  "behaviorProfile": "perfil en 1 línea",
  "communicationStyle": "estilo en 1 línea",
  "businessValue": "valor en 1 línea",
  "predictedActions": ["predicción1", "predicción2"],
  "satisfactionAnalysis": "análisis en 1 línea"
}

ENFOQUE ESPECÍFICO:
1. ¿Qué significa que un cliente pida muchos cambios?
2. ¿Qué implica que prefiera surtido vs productos específicos?
3. ¿Cómo afectan los múltiples destinos al negocio?
4. Estrategias para optimizar la relación según su patrón de pedidos
5. Riesgos y oportunidades específicas del comportamiento observado
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
              "Eres un consultor experto en análisis de clientes para panaderías. Entiendes los patrones de pedidos, la diferencia entre surtido y productos específicos, y el significado de cambios en pedidos. Proporciona análisis concisos, prácticos y accionables en español. Responde SOLO en formato JSON válido.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 800,
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

      if (!analysis.insights || !analysis.recommendations || !analysis.riskLevel) {
        throw new Error("Invalid GPT response structure")
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

  // Análisis específico de patrones de pedidos
  if (clientData.totalCambios > 5) {
    insights.push("Cliente con alta frecuencia de cambios - posible insatisfacción con surtido")
    recommendations.push("Consultar preferencias específicas para reducir cambios")
  }

  if (clientData.totalPedidosGenerales > clientData.totalPedidosEspecificos * 3) {
    insights.push("Cliente prefiere surtido variado - confía en la selección de la panadería")
    recommendations.push("Mantener calidad consistente en el surtido")
  } else if (clientData.totalPedidosEspecificos > clientData.totalPedidosGenerales) {
    insights.push("Cliente con preferencias específicas - sabe exactamente lo que quiere")
    recommendations.push("Asegurar disponibilidad de productos preferidos")
  }

  if (clientData.subDestinations && clientData.subDestinations.length > 0) {
    insights.push("Cliente redistribuye productos - posible revendedor o comprador grupal")
    recommendations.push("Considerar descuentos por volumen y horarios de entrega optimizados")
  }

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
  }
}

export async function POST(request: NextRequest) {
  try {
    const { conversations, isAccumulative, totalConversations } = await request.json()

    if (!conversations || typeof conversations !== "string") {
      return NextResponse.json({ error: "Conversaciones inválidas" }, { status: 400 })
    }

    const messages = parseWhatsAppConversations(conversations)

    // Verificar si se pudieron procesar mensajes válidos
    if (messages.length === 0) {
      return NextResponse.json(
        {
          error: "No se pudieron reconocer mensajes válidos en el texto. Verifica el formato del chat.",
        },
        { status: 400 },
      )
    }

    const analysis = await analyzeConversations(messages, isAccumulative, totalConversations)

    return NextResponse.json(analysis)
  } catch (error) {
    console.error("Error analyzing conversations:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

function parseWhatsAppConversations(text: string): Message[] {
  const messages: Message[] = []
  const lines = text.split("\n")

  // Regex mejorada para múltiples formatos de hora y fecha
  const whatsappRegex =
    /^\[(\d{1,2}:\d{2}(?:\s*(?:[ap]\.?m\.?|AM|PM))?),\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\]\s*([^:]+):\s*(.*)$/i

  for (const line of lines) {
    const trimmedLine = line.trim()
    if (!trimmedLine) continue

    const match = trimmedLine.match(whatsappRegex)
    if (match) {
      const [, time, date, sender, content] = match

      try {
        // Parse date más robusto
        const [datePart1, datePart2, year] = date.split("/").map(Number)
        let month: number, day: number, fullYear: number

        // Determinar formato de fecha basado en valores
        if (datePart1 > 12) {
          // Debe ser DD/MM
          day = datePart1
          month = datePart2
        } else if (datePart2 > 12) {
          // Debe ser MM/DD
          month = datePart1
          day = datePart2
        } else {
          // Ambiguo, asumir DD/MM (formato más común internacionalmente)
          day = datePart1
          month = datePart2
        }

        // Manejar años de 2 dígitos
        fullYear = year < 100 ? (year > 50 ? 1900 + year : 2000 + year) : year

        // Parse time más flexible
        let adjustedHour: number, minute: number

        // Detectar formato AM/PM (insensible a mayúsculas y puntos opcionales)
        const timeMatch = time.match(/(\d{1,2}):(\d{2})(?:\s*([ap])\.?m\.?)?/i)
        if (timeMatch) {
          const [, hourStr, minStr, period] = timeMatch
          const hour = Number.parseInt(hourStr)
          minute = Number.parseInt(minStr)

          if (period) {
            // Formato 12 horas
            adjustedHour = hour
            if (period.toLowerCase() === "p" && hour !== 12) adjustedHour += 12
            if (period.toLowerCase() === "a" && hour === 12) adjustedHour = 0
          } else {
            // Formato 24 horas
            adjustedHour = hour
          }
        } else {
          // Fallback para formatos no reconocidos
          const [hour, min] = time.split(":").map(Number)
          adjustedHour = hour
          minute = min
        }

        const timestamp = new Date(fullYear, month - 1, day, adjustedHour, minute)

        // Verificar que la fecha sea válida
        if (isNaN(timestamp.getTime())) {
          console.warn(`Invalid timestamp for line: ${line}`)
          continue
        }

        // Determinar si es cliente (no es la panadería)
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

async function analyzeConversations(messages: Message[], isAccumulative = false, totalConversations = 1) {
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
  let totalCambios = 0

  // Contexto de conversación para procesamiento cronológico
  const context: ConversationContext = {
    lastClientSender: null,
    lastBakeryMessageTime: null,
    clientStates: new Map(),
  }

  // Productos específicos de panadería (SIN "cambios")
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
      regex: /\b(?:bisquetes?|bisquetitos?)\b/gi,
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
      dieciséis: 16,
      diecisiete: 17,
      dieciocho: 18,
      diecinueve: 19,
      veinte: 20,
      treinta: 30,
      cuarenta: 40,
      cincuenta: 50,
    }
    const lowerText = text.toLowerCase()
    return numberMap[lowerText] || Number.parseInt(text) || 0
  }

  // Función para extraer números de un texto
  const extractNumbers = (text: string): number[] => {
    const numbers: number[] = []

    // Buscar números escritos en dígitos
    const digitMatches = text.match(/\b\d+\b/g)
    if (digitMatches) {
      numbers.push(...digitMatches.map(Number))
    }

    // Buscar números escritos en palabras
    const words = text.toLowerCase().split(/\s+/)
    for (const word of words) {
      const num = textToNumber(word)
      if (num > 0) {
        numbers.push(num)
      }
    }

    return numbers
  }

  // Función para identificar mensajes informativos que NO son pedidos
  const isInformativeMessage = (content: string, isClient: boolean): boolean => {
    const lowerContent = content.toLowerCase()

    if (isClient) {
      // Mensajes de cliente que NO son pedidos
      const clientInformativePatterns = [
        /^(hoy\s+no|no\s+hoy)$/i,
        /^(gcs|gracias|grasias)$/i,
        /^(ok|okay)$/i,
        /^(bdis|buenos\s+días|buenas\s+tardes|buenas\s+noches)$/i,
        /^(si|sí)$/i,
        /^(no)$/i,
        /^(listo|perfecto|excelente)$/i,
      ]

      return clientInformativePatterns.some((pattern) => pattern.test(content))
    } else {
      // Mensajes de la panadería que son informativos
      const bakeryInformativePatterns = [
        /el\s+día\s+de\s+hoy\s+no\s+estaremos\s+contando\s+con/i,
        /ya\s+va\s+a\s+salir\s+la\s+camioneta/i,
        /buenos?\s+días?\s+panadería/i,
        /cuántas?\s+piezas?\s+le\s+enviamos/i,
      ]

      return bakeryInformativePatterns.some((pattern) => pattern.test(content))
    }
  }

  // Función para extraer tags de conversación de mensajes informativos de la panadería
  const extractConversationTags = (content: string, timestamp: Date): ConversationTag[] => {
    const tags: ConversationTag[] = []
    const lowerContent = content.toLowerCase()

    if (lowerContent.includes("el día de hoy no estaremos contando con")) {
      tags.push({
        type: "AVISO_PRODUCCION",
        content: content,
        timestamp: timestamp,
      })
    }

    if (lowerContent.includes("ya va a salir la camioneta")) {
      tags.push({
        type: "INFO_ENTREGA",
        content: content,
        timestamp: timestamp,
      })
    }

    if (lowerContent.includes("cuántas piezas le enviamos")) {
      tags.push({
        type: "CONSULTA_PEDIDO",
        content: content,
        timestamp: timestamp,
      })
    }

    return tags
  }

  // Función para detectar pedidos múltiples y destinos
  const parseMultipleOrders = (content: string): Array<{ pieces: number; destination?: string; cambios?: number }> => {
    const orders: Array<{ pieces: number; destination?: string; cambios?: number }> = []
    const numbers = extractNumbers(content)

    // Detectar cambios primero
    const cambiosMatch = content.match(/(\d+|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+cambios?/gi)
    let totalCambiosInMessage = 0

    if (cambiosMatch) {
      cambiosMatch.forEach((match) => {
        const cambioNumber = extractNumbers(match)[0] || 0
        totalCambiosInMessage += cambioNumber
      })
    }

    // Detectar destinos específicos
    const destinationPatterns = [
      /para\s+la?\s+frutería\s+([^,\s]+)/gi,
      /para\s+([^,\s]+\s+frutería)/gi,
      /para\s+la?\s+tienda\s+([^,\s]+)/gi,
      /para\s+([^,\s]+)/gi,
    ]

    let hasDestination = false
    let destination = ""

    for (const pattern of destinationPatterns) {
      const match = content.match(pattern)
      if (match) {
        destination = match[0].replace(/para\s+la?\s*/gi, "").trim()
        hasDestination = true
        break
      }
    }

    // Analizar números en el contexto
    if (numbers.length === 0) {
      return orders
    }

    if (numbers.length === 1) {
      // Un solo número
      orders.push({
        pieces: numbers[0],
        destination: hasDestination ? destination : undefined,
        cambios: totalCambiosInMessage > 0 ? totalCambiosInMessage : undefined,
      })
    } else if (numbers.length === 2) {
      // Dos números - posiblemente "15 y 12 para la frutería"
      if (hasDestination) {
        // Primer número para el cliente principal, segundo para el destino
        orders.push({ pieces: numbers[0] })
        orders.push({ pieces: numbers[1], destination: destination })
      } else {
        // Ambos números para el cliente principal
        orders.push({ pieces: numbers[0] + numbers[1] })
      }

      if (totalCambiosInMessage > 0) {
        orders[orders.length - 1].cambios = totalCambiosInMessage
      }
    } else {
      // Múltiples números - sumar todos excepto los cambios
      const totalPieces = numbers.reduce((sum, num) => sum + num, 0)
      orders.push({
        pieces: totalPieces,
        destination: hasDestination ? destination : undefined,
        cambios: totalCambiosInMessage > 0 ? totalCambiosInMessage : undefined,
      })
    }

    return orders
  }

  // Función para determinar si un pedido es específico o general
  const determineOrderCategory = (content: string): "General (Surtido)" | "Específico (Complacencia)" => {
    // Si contiene nombres de productos específicos, es específico
    const hasSpecificProducts = Object.values(productPatterns).some((pattern) => pattern.regex.test(content))

    if (hasSpecificProducts) {
      return "Específico (Complacencia)"
    }

    // Si solo contiene números o "piezas", es general
    const isOnlyNumbers =
      /^\s*(\d+|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|veinte|treinta|cuarenta|cincuenta)(\s+(y|piezas?))?\s*$/i.test(
        content,
      )

    if (isOnlyNumbers) {
      return "General (Surtido)"
    }

    // Por defecto, la mayoría son generales según las instrucciones
    return "General (Surtido)"
  }

  // Procesar mensajes cronológicamente
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i]

    // Actualizar tendencias temporales
    hourlyTrends[message.timestamp.getHours()]++
    dailyTrends[message.timestamp.getDay()]++
    monthlyTrends[message.timestamp.getMonth()]++

    // Verificar si es un mensaje informativo
    if (isInformativeMessage(message.content, message.isClient)) {
      if (!message.isClient) {
        // Extraer tags de mensajes informativos de la panadería
        const tags = extractConversationTags(message.content, message.timestamp)
        conversationTags.push(...tags)
      }
      continue // Saltar mensajes informativos
    }

    if (message.isClient) {
      // Mensaje de cliente
      context.lastClientSender = message.sender

      // Inicializar cliente si no existe
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
        })
      }

      // Inicializar estado del cliente si no existe
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

      // Calcular tiempo de respuesta si la panadería estaba esperando respuesta
      if (clientState.awaitingResponse && clientState.lastBakeryMessage) {
        const responseTimeMs = message.timestamp.getTime() - clientState.lastBakeryMessage.getTime()
        const responseTimeHours = responseTimeMs / (1000 * 60 * 60)

        // Solo considerar tiempos de respuesta razonables (menos de 24 horas)
        if (responseTimeHours < 24) {
          clientState.responseTimes.push(responseTimeHours)
        }

        clientState.awaitingResponse = false
      }

      // Analizar contenido del mensaje
      const messageContent = message.content.toLowerCase()

      // Detectar indicadores de satisfacción
      const positiveWords = ["gracias", "perfecto", "excelente", "bueno", "ok", "bien", "genial", "súper"]
      const negativeWords = ["problema", "mal", "error", "queja", "reclamo", "demora", "tarde", "feo", "horrible"]

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
        messageContent.includes("luego pago")
      ) {
        clientAnalysis.paymentIssues++
      }

      // Analizar si el mensaje contiene pedidos múltiples
      const orders = parseMultipleOrders(message.content)

      if (orders.length > 0) {
        // Determinar categoría del pedido
        const orderCategory = determineOrderCategory(message.content)

        orders.forEach((order, orderIndex) => {
          const orderPieces = order.pieces
          let orderValue = 0
          const detectedProducts: string[] = []

          // Procesar cambios si existen
          if (order.cambios && order.cambios > 0) {
            clientAnalysis.totalCambios += order.cambios
            totalCambios += order.cambios
          }

          // Procesar destinos múltiples
          if (order.destination) {
            const existingDestination = clientAnalysis.subDestinations.find(
              (d) => d.destination.toLowerCase() === order.destination!.toLowerCase(),
            )
            if (existingDestination) {
              existingDestination.orders++
              existingDestination.pieces += orderPieces
            } else {
              clientAnalysis.subDestinations.push({
                destination: order.destination,
                orders: 1,
                pieces: orderPieces,
              })
            }
          }

          if (orderCategory === "Específico (Complacencia)") {
            // Detectar productos específicos
            Object.entries(productPatterns).forEach(([productName, pattern]) => {
              if (pattern.regex.test(message.content)) {
                const productCount = Math.floor(orderPieces / Object.keys(productPatterns).length) || 1

                // Actualizar contadores de productos del cliente
                const existingProduct = clientAnalysis.preferredProducts.find((p) => p.product === productName)
                if (existingProduct) {
                  existingProduct.count += productCount
                } else {
                  clientAnalysis.preferredProducts.push({ product: productName, count: productCount, percentage: 0 })
                }

                // Actualizar contadores globales
                products.set(productName, (products.get(productName) || 0) + productCount)

                detectedProducts.push(`${productCount} ${productName}`)
                orderValue += productCount * pattern.estimatedPrice
              }
            })

            clientAnalysis.specificOrders++
            clientAnalysis.specificPieces += orderPieces
            clientAnalysis.totalPedidosEspecificos++
            totalSpecificOrders++
            totalSpecificPieces += orderPieces
          } else {
            // Pedido general (surtido)
            detectedProducts.push(`${orderPieces} piezas surtidas`)
            orderValue = orderPieces * 850 // Precio promedio por pieza

            clientAnalysis.generalOrders++
            clientAnalysis.generalPieces += orderPieces
            clientAnalysis.totalPedidosGenerales++
            totalGeneralOrders++
            totalGeneralPieces += orderPieces
          }

          // Buscar precios explícitos mencionados
          const priceRegex = /\$?\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/g
          const prices = message.content.match(priceRegex)
          if (prices) {
            prices.forEach((priceStr) => {
              const price = Number.parseFloat(priceStr.replace(/\$|\.|,/g, ""))
              if (price > 1000) {
                orderValue = Math.max(orderValue, price)
              }
            })
          }

          // Usar valor estimado si no hay precio explícito
          if (orderValue === 0 && orderPieces > 0) {
            orderValue = orderPieces * 850 // Precio promedio por pieza
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
              clientState.responseTimes.length > 0
                ? clientState.responseTimes[clientState.responseTimes.length - 1]
                : 0,
            estimatedValue: orderValue,
            dayOfWeek: message.timestamp.toLocaleDateString("es-ES", { weekday: "long" }),
            hour: message.timestamp.getHours(),
            destination: order.destination,
            cambios: order.cambios,
          }

          ordersData.push(orderRecord)
        })
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

  // Calcular métricas finales para cada cliente
  const clientAnalysisPromises = Array.from(clients.entries()).map(async ([clientName, analysis]) => {
    const clientState = context.clientStates.get(clientName)

    // Calcular métricas finales
    analysis.avgPiecesPerOrder = analysis.totalOrders > 0 ? analysis.totalPieces / analysis.totalOrders : 0
    analysis.avgOrderValue = analysis.totalOrders > 0 ? analysis.totalSpent / analysis.totalOrders : 0
    analysis.satisfactionScore = analysis.compliments - analysis.complaints

    if (clientState) {
      analysis.messagesPerOrder =
        analysis.totalOrders > 0 ? clientState.totalMessages / analysis.totalOrders : clientState.totalMessages

      // Calcular tiempo de respuesta promedio
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

    // Detectar patrones de pedidos actualizados
    const patterns = []
    if (analysis.avgPiecesPerOrder >= 25) patterns.push("Pedidos grandes")
    if (analysis.orderFrequency > 4) patterns.push("Cliente frecuente")
    if (analysis.responseTimeHours > 3) patterns.push("Respuesta lenta")
    if (analysis.paymentIssues > 0) patterns.push("Problemas de pago")
    if (analysis.noResponseDays > 3) patterns.push("Días sin pedido")
    if (analysis.satisfactionScore > 2) patterns.push("Cliente satisfecho")
    if (analysis.satisfactionScore < -1) patterns.push("Cliente insatisfecho")
    if (analysis.avgOrderValue > 20000) patterns.push("Alto valor")
    if (analysis.totalPedidosEspecificos > analysis.totalPedidosGenerales)
      patterns.push("Prefiere productos específicos")
    if (analysis.totalPedidosGenerales > analysis.totalPedidosEspecificos) patterns.push("Prefiere surtido")
    if (analysis.totalCambios > 5) patterns.push("Solicita muchos cambios")
    if (analysis.subDestinations.length > 0) patterns.push("Múltiples destinos")
    analysis.orderPatterns = patterns

    // Calcular puntuación de dificultad actualizada
    analysis.difficultyScore =
      (analysis.messagesPerOrder > 2 ? 1 : 0) +
      (analysis.responseTimeHours > 4 ? 2 : 0) +
      analysis.paymentIssues * 3 +
      (analysis.noResponseDays > 3 ? 2 : 0) +
      (analysis.orderFrequency < 1 ? 1 : 0) +
      (analysis.complaints > analysis.compliments ? 2 : 0) +
      (analysis.totalCambios > 5 ? 1 : 0) // Penalizar muchos cambios

    // Calcular días desde el último pedido
    const today = new Date()
    const daysSinceLastOrder = Math.floor((today.getTime() - analysis.lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))

    // Implementar segmentación de clientes
    if (analysis.orderFrequency > 3 && analysis.totalSpent > 50000) {
      analysis.segment = "VIP"
    } else if (daysSinceLastOrder > 15 || analysis.satisfactionScore < 0) {
      analysis.segment = "En Riesgo"
    } else if (analysis.totalOrders < 3) {
      analysis.segment = "Nuevo"
    } else {
      analysis.segment = "Regular"
    }

    // Calcular nivel de riesgo de abandono (churnRisk)
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

    // Analizar con GPT si está disponible
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

  // Preparar datos finales con la nueva estructura
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
    // Nuevos campos
    "Total Pedidos Generales": analysis.totalPedidosGenerales,
    "Total Pedidos Específicos": analysis.totalPedidosEspecificos,
    "Total Cambios": analysis.totalCambios,
    "Destinos Múltiples": analysis.subDestinations
      .map((d) => `${d.destination} (${d.orders} pedidos, ${d.pieces} piezas)`)
      .join(", "),
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
  }))

  // Calcular estadísticas actualizadas
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
