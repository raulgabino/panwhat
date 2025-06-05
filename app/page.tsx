"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Upload, Download, BarChart3, Users, Clock, TrendingUp, AlertTriangle, Star, Plus, Trash2 } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts"
import { toast } from "sonner"

export default function WhatsAppAnalyzer() {
  const [conversations, setConversations] = useState("")
  const [allConversations, setAllConversations] = useState<string[]>([])
  const [analysisData, setAnalysisData] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [conversationHistory, setConversationHistory] = useState<Array<{ id: number; preview: string; date: string }>>(
    [],
  )

  // Persistencia automática de datos
  useEffect(() => {
    // Cargar datos guardados al iniciar
    const savedConversations = localStorage.getItem("whatsapp-conversations")
    const savedHistory = localStorage.getItem("whatsapp-history")
    const savedAnalysis = localStorage.getItem("whatsapp-analysis")

    if (savedConversations) {
      setAllConversations(JSON.parse(savedConversations))
    }
    if (savedHistory) {
      setConversationHistory(JSON.parse(savedHistory))
    }
    if (savedAnalysis) {
      setAnalysisData(JSON.parse(savedAnalysis))
    }
  }, [])

  // Guardar automáticamente cuando cambian los datos
  useEffect(() => {
    if (allConversations.length > 0) {
      localStorage.setItem("whatsapp-conversations", JSON.stringify(allConversations))
    }
  }, [allConversations])

  useEffect(() => {
    if (conversationHistory.length > 0) {
      localStorage.setItem("whatsapp-history", JSON.stringify(conversationHistory))
    }
  }, [conversationHistory])

  useEffect(() => {
    if (analysisData) {
      localStorage.setItem("whatsapp-analysis", JSON.stringify(analysisData))
    }
  }, [analysisData])

  const handleAddConversation = () => {
    if (!conversations.trim()) {
      toast.error("Por favor, ingresa una conversación antes de agregarla")
      return
    }

    const newId = Date.now()
    const preview = conversations.substring(0, 100) + "..."
    const date = new Date().toLocaleDateString()

    setAllConversations((prev) => [...prev, conversations])
    setConversationHistory((prev) => [...prev, { id: newId, preview, date }])
    setConversations("")

    toast.success("Conversación agregada exitosamente")
  }

  const handleRemoveConversation = (index: number) => {
    setAllConversations((prev) => prev.filter((_, i) => i !== index))
    setConversationHistory((prev) => prev.filter((_, i) => i !== index))
  }

  const handleAnalyzeAll = async () => {
    if (allConversations.length === 0) {
      toast.error("Por favor, agrega al menos una conversación antes de analizar")
      return
    }

    setIsProcessing(true)

    try {
      // Combinar todas las conversaciones
      const combinedConversations = allConversations.join("\n")

      const response = await fetch("/api/analyze-whatsapp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversations: combinedConversations,
          isAccumulative: true,
          totalConversations: allConversations.length,
        }),
      })

      const data = await response.json()
      setAnalysisData(data)
      toast.success("Análisis completado", {
        description: `Se analizaron ${data.totalClients} clientes y ${data.totalOrders} pedidos.`,
      })
    } catch (error) {
      console.error("Error analyzing conversations:", error)
      toast.error("Error al procesar", {
        description: "Hubo un problema al analizar las conversaciones.",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClearAll = () => {
    toast("¿Eliminar todas las conversaciones?", {
      description: "Esta acción no se puede deshacer.",
      action: {
        label: "Eliminar",
        onClick: () => {
          setAllConversations([])
          setConversationHistory([])
          setAnalysisData(null)
          setConversations("")

          // Limpiar también localStorage
          localStorage.removeItem("whatsapp-conversations")
          localStorage.removeItem("whatsapp-history")
          localStorage.removeItem("whatsapp-analysis")

          toast.success("Datos eliminados", { description: "Todas las conversaciones han sido eliminadas." })
        },
      },
      cancel: {
        label: "Cancelar",
        onClick: () => {},
      },
    })
  }

  const downloadCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return

    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(","),
      ...data.map((row) => headers.map((header) => `"${row[header] || ""}"`).join(",")),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", filename)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getDifficultyBadge = (score: number) => {
    if (score >= 6) return <Badge variant="destructive">Muy Difícil</Badge>
    if (score >= 4) return <Badge variant="secondary">Difícil</Badge>
    if (score >= 2) return <Badge variant="outline">Moderado</Badge>
    return <Badge variant="default">Fácil</Badge>
  }

  const getPopularityBadge = (popularity: string) => {
    const variants = {
      "Muy Alta": "default",
      Alta: "secondary",
      Media: "outline",
      Baja: "destructive",
    } as const
    return <Badge variant={variants[popularity as keyof typeof variants] || "outline"}>{popularity}</Badge>
  }

  const getRiskBadge = (riskLevel: string) => {
    const variants = {
      high: "destructive",
      medium: "secondary",
      low: "default",
    } as const
    return (
      <Badge variant={variants[riskLevel as keyof typeof variants] || "outline"}>
        {riskLevel === "high" ? "Alto" : riskLevel === "medium" ? "Medio" : "Bajo"}
      </Badge>
    )
  }

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D", "#FFC658", "#FF7C7C"]

  // Funciones de Análisis Predictivo y Segmentación
  const performPredictiveAnalysis = (analysisData: any) => {
    if (!analysisData.clientsData) return null

    // 1. Segmentación automática de clientes
    const clientSegments = segmentClients(analysisData.clientsData)

    // 2. Predicción de demanda mejorada
    const demandPrediction = predictDemand(analysisData.ordersData, analysisData.productsData)

    // 3. Análisis de riesgo de abandono
    const churnRisk = analyzeChurnRisk(analysisData.clientsData)

    // 4. Oportunidades de crecimiento
    const growthOpportunities = identifyGrowthOpportunities(analysisData.clientsData)

    // 5. Análisis de ciclo de vida
    const lifecycleAnalysis = analyzeClientLifecycle(analysisData.clientsData)

    // 6. NUEVO: Análisis CLV para recuperación de clientes
    const recoveryAnalysis = calculateCustomerLifetimeValue(analysisData.clientsData)

    return {
      clientSegments,
      demandPrediction,
      churnRisk,
      growthOpportunities,
      lifecycleAnalysis,
      recoveryAnalysis,
    }
  }

  const segmentClients = (clientsData: any[]) => {
    const segments = {
      vip: [] as any[],
      regular: [] as any[],
      occasional: [] as any[],
      problematic: [] as any[],
      newbie: [] as any[],
    }

    clientsData.forEach((client) => {
      const totalSpent = client["Total Gastado"] || 0
      const frequency = client["Frecuencia Semanal"] || 0
      const difficulty = client["Puntuación Dificultad"] || 0
      const totalOrders = client["Total Pedidos"] || 0
      const satisfaction = client["Puntuación Satisfacción"] || 0

      // Lógica de segmentación
      if (totalSpent > 50000 && frequency > 3 && difficulty < 3) {
        segments.vip.push({ ...client, segment: "VIP", segmentColor: "#10B981" })
      } else if (difficulty > 5 || client["Problemas Pago"] > 1) {
        segments.problematic.push({ ...client, segment: "Problemático", segmentColor: "#EF4444" })
      } else if (totalOrders < 3) {
        segments.newbie.push({ ...client, segment: "Nuevo", segmentColor: "#8B5CF6" })
      } else if (frequency > 2 && totalSpent > 20000) {
        segments.regular.push({ ...client, segment: "Regular", segmentColor: "#3B82F6" })
      } else {
        segments.occasional.push({ ...client, segment: "Ocasional", segmentColor: "#F59E0B" })
      }
    })

    return segments
  }

  const predictDemand = (ordersData: any[], productsData: any[]) => {
    if (!ordersData || ordersData.length === 0) return null

    // Análisis avanzado de tendencias por día de la semana
    const weeklyTrends = Array(7)
      .fill(0)
      .map((_, day) => {
        const dayName = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][day]
        const dayOrders = ordersData.filter((order) => {
          const orderDate = new Date(order.Fecha)
          return orderDate.getDay() === day
        })

        if (dayOrders.length === 0) {
          return {
            day: dayName,
            avgDemand: 0,
            orderCount: 0,
            predictedDemand: 0,
            confidence: "Sin datos",
            trend: "Sin datos",
            seasonalFactor: 1,
            recommendations: ["No hay datos históricos para este día"],
          }
        }

        // Calcular tendencia temporal (últimos vs primeros pedidos)
        const sortedOrders = dayOrders.sort((a, b) => new Date(a.Fecha).getTime() - new Date(b.Fecha).getTime())
        const recentOrders = sortedOrders.slice(-Math.ceil(sortedOrders.length / 3))
        const oldOrders = sortedOrders.slice(0, Math.ceil(sortedOrders.length / 3))

        const recentAvg =
          recentOrders.length > 0
            ? recentOrders.reduce((sum, order) => sum + (order["Total Piezas"] || 0), 0) / recentOrders.length
            : 0
        const oldAvg =
          oldOrders.length > 0
            ? oldOrders.reduce((sum, order) => sum + (order["Total Piezas"] || 0), 0) / oldOrders.length
            : 0

        const trendPercentage = oldAvg > 0 ? ((recentAvg - oldAvg) / oldAvg) * 100 : 0

        // Análisis estacional (por mes)
        const monthlyVariation = dayOrders.reduce((acc, order) => {
          const month = new Date(order.Fecha).getMonth()
          if (!acc[month]) acc[month] = []
          acc[month].push(order["Total Piezas"] || 0)
          return acc
        }, {} as any)

        const currentMonth = new Date().getMonth()
        const seasonalFactor = monthlyVariation[currentMonth]
          ? monthlyVariation[currentMonth].reduce((sum: number, val: number) => sum + val, 0) /
              monthlyVariation[currentMonth].length /
              recentAvg || 1
          : 1

        // Cálculos base
        const totalPieces = dayOrders.reduce((sum, order) => sum + (order["Total Piezas"] || 0), 0)
        const avgPieces = totalPieces / dayOrders.length

        // Predicción mejorada con múltiples factores
        let predictedDemand = avgPieces

        // Aplicar tendencia
        if (trendPercentage > 10) {
          predictedDemand *= 1.15 // Crecimiento fuerte
        } else if (trendPercentage > 0) {
          predictedDemand *= 1.05 // Crecimiento moderado
        } else if (trendPercentage < -10) {
          predictedDemand *= 0.9 // Declive
        }

        // Aplicar factor estacional
        predictedDemand *= Math.max(0.7, Math.min(1.3, seasonalFactor))

        // Factor de día específico (lunes suele ser más alto después del fin de semana)
        if (day === 1) {
          // Lunes
          predictedDemand *= 1.1 // 10% más por efecto "lunes"
        } else if (day === 0 || day === 6) {
          // Fin de semana
          predictedDemand *= 0.8 // 20% menos
        }

        // Buffer de seguridad basado en variabilidad
        const variance =
          dayOrders.reduce((sum, order) => {
            const pieces = order["Total Piezas"] || 0
            return sum + Math.pow(pieces - avgPieces, 2)
          }, 0) / dayOrders.length
        const stdDev = Math.sqrt(variance)
        const variabilityBuffer = stdDev / avgPieces > 0.3 ? 1.2 : 1.1

        predictedDemand *= variabilityBuffer

        // Generar recomendaciones específicas
        const recommendations = []
        if (day === 1) {
          // Lunes
          recommendations.push("Preparar 10-15% más que el promedio (efecto post fin de semana)")
          if (trendPercentage > 5) {
            recommendations.push("Tendencia creciente detectada - considerar aumentar producción")
          }
        }
        if (stdDev / avgPieces > 0.4) {
          recommendations.push("Alta variabilidad - mantener stock de seguridad")
        }
        if (seasonalFactor > 1.1) {
          recommendations.push("Mes de alta demanda - aumentar producción base")
        } else if (seasonalFactor < 0.9) {
          recommendations.push("Mes de baja demanda - reducir producción base")
        }

        return {
          day: dayName,
          avgDemand: Math.round(avgPieces),
          orderCount: dayOrders.length,
          predictedDemand: Math.round(predictedDemand),
          confidence: dayOrders.length > 8 ? "Alta" : dayOrders.length > 4 ? "Media" : "Baja",
          trend: trendPercentage > 5 ? "Creciente" : trendPercentage < -5 ? "Declinante" : "Estable",
          trendPercentage: Math.round(trendPercentage),
          seasonalFactor: Math.round(seasonalFactor * 100) / 100,
          variability: Math.round((stdDev / avgPieces) * 100),
          recommendations,
        }
      })

    // Análisis mejorado de productos con predicción individual
    const productTrends =
      productsData?.slice(0, 8).map((product) => {
        const productOrders = ordersData.filter((order) =>
          order.Productos.toLowerCase().includes(product.Producto.toLowerCase()),
        )

        if (productOrders.length < 3) {
          return {
            product: product.Producto,
            currentDemand: product["Total Pedidos"],
            trend: 0,
            predictedGrowth: "Datos insuficientes",
            recommendation: "Recopilar más datos",
            weeklyPrediction: 0,
            confidence: "Baja",
          }
        }

        // Análisis temporal más sofisticado
        const sortedOrders = productOrders.sort((a, b) => new Date(a.Fecha).getTime() - new Date(b.Fecha).getTime())
        const recentOrders = sortedOrders.slice(-Math.ceil(sortedOrders.length / 3))
        const oldOrders = sortedOrders.slice(0, Math.ceil(sortedOrders.length / 3))

        const recentAvg =
          recentOrders.length > 0
            ? recentOrders.reduce((sum, o) => sum + (o["Total Piezas"] || 0), 0) / recentOrders.length
            : 0
        const oldAvg =
          oldOrders.length > 0 ? oldOrders.reduce((sum, o) => sum + (o["Total Piezas"] || 0), 0) / oldOrders.length : 0

        const trend = oldAvg > 0 ? ((recentAvg - oldAvg) / oldAvg) * 100 : 0

        // Predicción semanal
        const avgWeeklyDemand =
          productOrders.reduce((sum, o) => sum + (o["Total Piezas"] || 0), 0) / Math.max(1, productOrders.length / 7) // Aproximar semanas

        let weeklyPrediction = avgWeeklyDemand
        if (trend > 15) weeklyPrediction *= 1.2
        else if (trend > 5) weeklyPrediction *= 1.1
        else if (trend < -15) weeklyPrediction *= 0.8
        else if (trend < -5) weeklyPrediction *= 0.9

        return {
          product: product.Producto,
          currentDemand: product["Total Pedidos"],
          trend: Math.round(trend),
          predictedGrowth:
            trend > 15
              ? "Crecimiento fuerte"
              : trend > 5
                ? "Crecimiento moderado"
                : trend < -15
                  ? "Declive fuerte"
                  : trend < -5
                    ? "Declive moderado"
                    : "Estable",
          recommendation:
            trend > 15
              ? "Aumentar producción 20%"
              : trend > 5
                ? "Aumentar producción 10%"
                : trend < -15
                  ? "Reducir producción 20%"
                  : trend < -5
                    ? "Reducir producción 10%"
                    : "Mantener nivel actual",
          weeklyPrediction: Math.round(weeklyPrediction),
          confidence: productOrders.length > 10 ? "Alta" : productOrders.length > 5 ? "Media" : "Baja",
        }
      }) || []

    return { weeklyTrends, productTrends }
  }

  const calculateCustomerLifetimeValue = (clientsData: any[]) => {
    if (!clientsData || clientsData.length === 0) return []

    return clientsData
      .map((client) => {
        const totalSpent = client["Total Gastado"] || 0
        const totalOrders = client["Total Pedidos"] || 0
        const frequency = client["Frecuencia Semanal"] || 0
        const avgOrderValue = client["Valor Promedio Pedido"] || 0
        const satisfaction = client["Puntuación Satisfacción"] || 0
        const difficulty = client["Puntuación Dificultad"] || 0
        const paymentIssues = client["Problemas Pago"] || 0
        const lastOrderDate = new Date(client["Último Pedido"])
        const daysSinceLastOrder = Math.floor((new Date().getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))

        // Calcular probabilidad de retención (0-1)
        let retentionProbability = 0.5 // Base 50%

        // Factores positivos
        if (satisfaction > 0) retentionProbability += 0.2
        if (frequency > 2) retentionProbability += 0.15
        if (totalOrders > 5) retentionProbability += 0.1
        if (avgOrderValue > 15000) retentionProbability += 0.1

        // Factores negativos
        if (difficulty > 4) retentionProbability -= 0.2
        if (paymentIssues > 0) retentionProbability -= 0.15
        if (daysSinceLastOrder > 30) retentionProbability -= 0.2
        if (satisfaction < 0) retentionProbability -= 0.25

        // Limitar entre 0.05 y 0.95
        retentionProbability = Math.max(0.05, Math.min(0.95, retentionProbability))

        // Calcular duración esperada de la relación (en semanas)
        const expectedLifetimeWeeks =
          frequency > 0 ? (52 * retentionProbability) / (1 - retentionProbability + 0.01) : 12

        // CLV = Valor promedio por pedido × Frecuencia × Duración esperada × Probabilidad de retención
        const predictedCLV = avgOrderValue * frequency * expectedLifetimeWeeks * retentionProbability

        // Costo estimado de recuperación (basado en dificultad y tiempo sin pedidos)
        let recoveryEffort = 1 // Esfuerzo base
        if (daysSinceLastOrder > 60) recoveryEffort += 2
        if (difficulty > 4) recoveryEffort += 1
        if (paymentIssues > 0) recoveryEffort += 1
        if (satisfaction < 0) recoveryEffort += 2

        const estimatedRecoveryCost = recoveryEffort * 2000 // $2000 por unidad de esfuerzo

        // ROI de recuperación
        const recoveryROI = predictedCLV > 0 ? (predictedCLV - estimatedRecoveryCost) / estimatedRecoveryCost : -1

        // Determinar si vale la pena recuperar
        let worthRecovering = "No"
        let priority = "Baja"
        let strategy = "No recomendado"

        if (recoveryROI > 3) {
          // ROI > 300%
          worthRecovering = "Definitivamente"
          priority = "Alta"
          strategy = "Contacto personal + oferta especial"
        } else if (recoveryROI > 1) {
          // ROI > 100%
          worthRecovering = "Sí"
          priority = "Media"
          strategy = "Llamada telefónica + descuento"
        } else if (recoveryROI > 0.5) {
          // ROI > 50%
          worthRecovering = "Tal vez"
          priority = "Baja"
          strategy = "WhatsApp con promoción"
        } else {
          strategy = "Dejar ir - enfocar recursos en otros clientes"
        }

        // Factores de riesgo específicos
        const riskFactors = []
        if (daysSinceLastOrder > 60) riskFactors.push("Mucho tiempo sin pedidos")
        if (difficulty > 4) riskFactors.push("Cliente difícil de manejar")
        if (paymentIssues > 0) riskFactors.push("Historial de problemas de pago")
        if (satisfaction < 0) riskFactors.push("Baja satisfacción")
        if (frequency < 1) riskFactors.push("Baja frecuencia histórica")

        return {
          client: client["Nombre Cliente"],
          currentValue: totalSpent,
          predictedCLV: Math.round(predictedCLV),
          retentionProbability: Math.round(retentionProbability * 100),
          expectedLifetimeWeeks: Math.round(expectedLifetimeWeeks),
          recoveryROI: Math.round(recoveryROI * 100),
          estimatedRecoveryCost,
          worthRecovering,
          priority,
          strategy,
          riskFactors,
          daysSinceLastOrder,
          quickWins: [
            avgOrderValue > 10000 ? "Cliente de valor medio-alto" : null,
            frequency > 1 ? "Tenía buena frecuencia" : null,
            satisfaction >= 0 ? "Sin problemas de satisfacción" : null,
            paymentIssues === 0 ? "Sin problemas de pago" : null,
          ].filter(Boolean),
        }
      })
      .filter((client) => client.daysSinceLastOrder > 14) // Solo clientes que no han pedido en 2+ semanas
      .sort((a, b) => b.recoveryROI - a.recoveryROI) // Ordenar por ROI descendente
  }

  const analyzeChurnRisk = (clientsData: any[]) => {
    const today = new Date()

    return clientsData
      .map((client) => {
        const lastOrderDate = new Date(client["Último Pedido"])
        const daysSinceLastOrder = Math.floor((today.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))
        const frequency = client["Frecuencia Semanal"] || 0
        const expectedDays = frequency > 0 ? 7 / frequency : 30

        let riskLevel = "Bajo"
        let riskScore = 0

        // Calcular score de riesgo
        if (daysSinceLastOrder > expectedDays * 2) riskScore += 3
        if (client["Puntuación Satisfacción"] < 0) riskScore += 2
        if (client["Problemas Pago"] > 0) riskScore += 2
        if (frequency < 1) riskScore += 1
        if (client["Puntuación Dificultad"] > 5) riskScore += 1

        if (riskScore >= 6) riskLevel = "Alto"
        else if (riskScore >= 3) riskLevel = "Medio"

        return {
          client: client["Nombre Cliente"],
          riskLevel,
          riskScore,
          daysSinceLastOrder,
          expectedDays: Math.round(expectedDays),
          reasons: [
            daysSinceLastOrder > expectedDays * 2 ? "Tiempo excesivo sin pedidos" : null,
            client["Puntuación Satisfacción"] < 0 ? "Baja satisfacción" : null,
            client["Problemas Pago"] > 0 ? "Problemas de pago" : null,
            frequency < 1 ? "Baja frecuencia histórica" : null,
          ].filter(Boolean),
          recommendation:
            riskLevel === "Alto"
              ? "Contactar inmediatamente"
              : riskLevel === "Medio"
                ? "Seguimiento semanal"
                : "Monitoreo regular",
        }
      })
      .filter((client) => client.riskLevel !== "Bajo")
      .sort((a, b) => b.riskScore - a.riskScore)
  }

  const identifyGrowthOpportunities = (clientsData: any[]) => {
    return clientsData
      .map((client) => {
        const totalSpent = client["Total Gastado"] || 0
        const frequency = client["Frecuencia Semanal"] || 0
        const avgOrder = client["Valor Promedio Pedido"] || 0
        const satisfaction = client["Puntuación Satisfacción"] || 0

        const opportunities = []
        let potentialValue = 0

        // Oportunidad de frecuencia
        if (frequency < 2 && satisfaction > 0 && totalSpent > 10000) {
          opportunities.push("Aumentar frecuencia de pedidos")
          potentialValue += avgOrder * 52 // Potencial anual
        }

        // Oportunidad de valor por pedido
        if (avgOrder < 15000 && frequency > 2) {
          opportunities.push("Incrementar valor por pedido")
          potentialValue += 5000 * frequency * 52
        }

        // Oportunidad de productos premium
        if (totalSpent > 30000 && client["Productos Detallados"]?.length < 3) {
          opportunities.push("Diversificar productos")
          potentialValue += avgOrder * 0.3 * frequency * 52
        }

        // Oportunidad de fidelización
        if (satisfaction > 1 && frequency > 3 && totalSpent < 50000) {
          opportunities.push("Programa de fidelización")
          potentialValue += totalSpent * 0.2
        }

        return {
          client: client["Nombre Cliente"],
          currentValue: totalSpent,
          potentialValue: Math.round(potentialValue),
          growthPotential: potentialValue > 0 ? Math.round((potentialValue / Math.max(totalSpent, 1)) * 100) : 0,
          opportunities,
          priority: potentialValue > 50000 ? "Alta" : potentialValue > 20000 ? "Media" : "Baja",
        }
      })
      .filter((client) => client.opportunities.length > 0)
      .sort((a, b) => b.potentialValue - a.potentialValue)
  }

  const analyzeClientLifecycle = (clientsData: any[]) => {
    return clientsData.map((client) => {
      const totalOrders = client["Total Pedidos"] || 0
      const frequency = client["Frecuencia Semanal"] || 0
      const lastOrderDate = new Date(client["Último Pedido"])
      const today = new Date()
      const daysSinceLastOrder = Math.floor((today.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))

      let stage = ""
      let stageColor = ""
      let nextAction = ""

      if (totalOrders < 3) {
        stage = "Nuevo Cliente"
        stageColor = "#8B5CF6"
        nextAction = "Asegurar buena primera experiencia"
      } else if (frequency > 3 && daysSinceLastOrder < 14) {
        stage = "Cliente Activo"
        stageColor = "#10B981"
        nextAction = "Mantener satisfacción y explorar upselling"
      } else if (frequency > 1 && daysSinceLastOrder < 30) {
        stage = "Cliente Regular"
        stageColor = "#3B82F6"
        nextAction = "Incentivar mayor frecuencia"
      } else if (daysSinceLastOrder > 30 && daysSinceLastOrder < 90) {
        stage = "En Riesgo"
        stageColor = "#F59E0B"
        nextAction = "Campaña de reactivación"
      } else {
        stage = "Inactivo"
        stageColor = "#EF4444"
        nextAction = "Evaluar si vale la pena recuperar"
      }

      return {
        client: client["Nombre Cliente"],
        stage,
        stageColor,
        nextAction,
        daysSinceLastOrder,
        totalValue: client["Total Gastado"] || 0,
      }
    })
  }

  const prepareChartData = (analysisData: any) => {
    // Datos para gráfico de productos
    const productChartData =
      analysisData.productsData?.slice(0, 8).map((product: any, index: number) => ({
        name: product.Producto,
        cantidad: product["Total Pedidos"],
        color: COLORS[index % COLORS.length],
      })) || []

    // Datos para gráfico de clientes por valor
    const clientValueData =
      analysisData.clientsData?.slice(0, 10).map((client: any) => ({
        name:
          client["Nombre Cliente"].length > 15
            ? client["Nombre Cliente"].substring(0, 15) + "..."
            : client["Nombre Cliente"],
        valor: client["Total Gastado"],
        pedidos: client["Total Pedidos"],
      })) || []

    // Datos para tendencias horarias
    const hourlyData =
      analysisData.trendsData
        ?.filter((trend: any) => trend.Tipo === "Hora")
        .map((trend: any) => ({
          hora: trend.Periodo,
          actividad: trend.Actividad,
        })) || []

    // Datos para tendencias por día de la semana
    const dailyData =
      analysisData.trendsData
        ?.filter((trend: any) => trend.Tipo === "Día Semana")
        .map((trend: any) => ({
          dia: trend.Periodo,
          actividad: trend.Actividad,
        })) || []

    // Datos para distribución de dificultad
    const difficultyData = [
      {
        name: "Fácil (0-1)",
        value: analysisData.clientsData?.filter((c: any) => c["Puntuación Dificultad"] <= 1).length || 0,
      },
      {
        name: "Moderado (2-3)",
        value:
          analysisData.clientsData?.filter(
            (c: any) => c["Puntuación Dificultad"] >= 2 && c["Puntuación Dificultad"] <= 3,
          ).length || 0,
      },
      {
        name: "Difícil (4-5)",
        value:
          analysisData.clientsData?.filter(
            (c: any) => c["Puntuación Dificultad"] >= 4 && c["Puntuación Dificultad"] <= 5,
          ).length || 0,
      },
      {
        name: "Muy Difícil (6+)",
        value: analysisData.clientsData?.filter((c: any) => c["Puntuación Dificultad"] >= 6).length || 0,
      },
    ]

    // Datos para distribución de riesgo
    const riskData = [
      {
        name: "Bajo Riesgo",
        value: analysisData.clientsData?.filter((c: any) => c["Nivel de Riesgo"] === "low").length || 0,
      },
      {
        name: "Riesgo Medio",
        value: analysisData.clientsData?.filter((c: any) => c["Nivel de Riesgo"] === "medium").length || 0,
      },
      {
        name: "Alto Riesgo",
        value: analysisData.clientsData?.filter((c: any) => c["Nivel de Riesgo"] === "high").length || 0,
      },
    ]

    return {
      productChartData,
      clientValueData,
      hourlyData,
      dailyData,
      difficultyData,
      riskData,
    }
  }

  const prepareClientChartData = (client: any, analysisData: any) => {
    // Historial de pedidos del cliente
    const clientOrders =
      analysisData.ordersData?.filter((order: any) => order.Cliente === client["Nombre Cliente"]) || []

    // Agrupar pedidos por mes
    const monthlyOrders = clientOrders.reduce((acc: any, order: any) => {
      const date = new Date(order.Fecha)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

      if (!acc[monthKey]) {
        acc[monthKey] = { month: monthKey, pedidos: 0, piezas: 0, valor: 0 }
      }

      acc[monthKey].pedidos += 1
      acc[monthKey].piezas += order["Total Piezas"] || 0
      acc[monthKey].valor += order["Valor Estimado"] || 0

      return acc
    }, {})

    const monthlyData = Object.values(monthlyOrders).sort((a: any, b: any) => a.month.localeCompare(b.month))

    // Productos preferidos del cliente
    const clientProductData =
      client["Productos Detallados"]?.map((product: any, index: number) => ({
        name: product.product,
        cantidad: product.count,
        porcentaje: product.percentage,
        color: COLORS[index % COLORS.length],
      })) || []

    return {
      monthlyData,
      clientProductData,
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-center mb-2">Analizador de WhatsApp - Panadería Quilantán</h1>
        <p className="text-muted-foreground text-center">
          Analiza conversaciones de WhatsApp para obtener insights de ventas y comportamiento de clientes
        </p>
      </div>

      <div className="grid gap-6">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Gestionar Conversaciones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Pega aquí las conversaciones de WhatsApp exportadas...&#10;&#10;Ejemplo:&#10;[7:37 AM, 3/7/2025] Panaderia Quilantan: B días panadería Quilantan cuántas piezas le enviamos hoy gracias&#10;[10:19 AM, 3/7/2025] Abts Emilio: 2 pastelitos 1 donas 2 bisquete..."
              value={conversations}
              onChange={(e) => setConversations(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
            />

            <div className="flex gap-2">
              <Button
                onClick={handleAddConversation}
                disabled={!conversations.trim()}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Agregar Conversación
              </Button>

              <Button
                onClick={handleAnalyzeAll}
                disabled={isProcessing || allConversations.length === 0}
                variant="default"
                className="flex items-center gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                {isProcessing ? "Analizando..." : `Analizar Todo (${allConversations.length})`}
              </Button>

              <Button
                onClick={handleClearAll}
                disabled={allConversations.length === 0}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Limpiar Todo
              </Button>

              <Button
                onClick={() => {
                  const saved = localStorage.getItem("whatsapp-conversations")
                  if (saved) {
                    const conversations = JSON.parse(saved)
                    setAllConversations(conversations)
                    toast.success("Datos recuperados", {
                      description: `Se recuperaron ${conversations.length} conversaciones guardadas.`,
                    })
                  } else {
                    toast.error("No hay datos guardados para recuperar")
                  }
                }}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Recuperar Datos Guardados
              </Button>
            </div>

            {/* Historial de conversaciones */}
            {conversationHistory.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Conversaciones Agregadas ({conversationHistory.length})</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {conversationHistory.map((conv, index) => (
                    <div key={conv.id} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                      <div className="flex-1">
                        <span className="font-medium">Conversación {index + 1}</span>
                        <span className="text-muted-foreground ml-2">({conv.date})</span>
                        <p className="text-xs text-muted-foreground truncate mt-1">{conv.preview}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveConversation(index)}
                        className="ml-2"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Section */}
        {analysisData && (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-8">
              <TabsTrigger value="overview">Resumen General</TabsTrigger>
              <TabsTrigger value="visualizations">Visualizaciones</TabsTrigger>
              <TabsTrigger value="clients">Todos los Clientes</TabsTrigger>
              <TabsTrigger value="individual">Análisis Individual</TabsTrigger>
              <TabsTrigger value="gpt-insights">Insights IA</TabsTrigger>
              <TabsTrigger value="products">Productos</TabsTrigger>
              <TabsTrigger value="trends">Tendencias</TabsTrigger>
              <TabsTrigger value="export">Exportar</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Métricas principales */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="text-2xl font-bold">{analysisData.totalClients || 0}</p>
                        <p className="text-sm text-muted-foreground">Clientes Únicos</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-2">
                      <BarChart3 className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-2xl font-bold">{analysisData.totalOrders || 0}</p>
                        <p className="text-sm text-muted-foreground">Pedidos Totales</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-purple-600" />
                      <div>
                        <p className="text-2xl font-bold">{analysisData.totalPieces || 0}</p>
                        <p className="text-sm text-muted-foreground">Piezas Totales</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-orange-600" />
                      <div>
                        <p className="text-2xl font-bold">{analysisData.avgResponseTime || 0}h</p>
                        <p className="text-sm text-muted-foreground">Tiempo Resp. Promedio</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-2">
                      <Upload className="h-4 w-4 text-indigo-600" />
                      <div>
                        <p className="text-2xl font-bold">{allConversations.length}</p>
                        <p className="text-sm text-muted-foreground">Conversaciones</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Análisis general del negocio */}
              <Card>
                <CardHeader>
                  <CardTitle>📊 Análisis General del Negocio</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3 text-blue-600">Rendimiento de Clientes</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Clientes frecuentes (&gt;4 pedidos/semana):</span>
                          <Badge variant="default">
                            {analysisData.clientsData?.filter((c: any) => c["Frecuencia Semanal"] > 4).length || 0}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Clientes de alto valor (&gt;$50k):</span>
                          <Badge variant="secondary">
                            {analysisData.clientsData?.filter((c: any) => c["Total Gastado"] > 50000).length || 0}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Clientes con problemas de pago:</span>
                          <Badge variant="destructive">
                            {analysisData.clientsData?.filter((c: any) => c["Problemas Pago"] > 0).length || 0}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3 text-green-600">Satisfacción y Comunicación</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Clientes satisfechos:</span>
                          <Badge variant="default">
                            {analysisData.clientsData?.filter((c: any) => c["Puntuación Satisfacción"] > 0).length || 0}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Respuesta lenta (&gt;4h):</span>
                          <Badge variant="outline">
                            {analysisData.clientsData?.filter((c: any) => c["Tiempo Respuesta (hrs)"] > 4).length || 0}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Clientes difíciles (score &gt;4):</span>
                          <Badge variant="secondary">
                            {analysisData.clientsData?.filter((c: any) => c["Puntuación Dificultad"] > 4).length || 0}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3 text-purple-600">Métricas de Negocio</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Ingresos totales estimados:</span>
                          <Badge variant="default">
                            $
                            {analysisData.clientsData
                              ?.reduce((sum: number, c: any) => sum + (c["Total Gastado"] || 0), 0)
                              .toLocaleString()}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Valor promedio por cliente:</span>
                          <Badge variant="secondary">
                            $
                            {Math.round(
                              analysisData.clientsData?.reduce(
                                (sum: number, c: any) => sum + (c["Total Gastado"] || 0),
                                0,
                              ) / (analysisData.totalClients || 1),
                            ).toLocaleString()}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Pedidos promedio por cliente:</span>
                          <Badge variant="outline">
                            {Math.round(((analysisData.totalOrders || 0) / (analysisData.totalClients || 1)) * 10) / 10}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Top insights */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-yellow-500" />
                      Top 5 Mejores Clientes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analysisData.clientsData?.slice(0, 5).map((client: any, index: number) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                        <div>
                          <p className="font-medium">{client["Nombre Cliente"]}</p>
                          <p className="text-sm text-muted-foreground">
                            ${client["Total Gastado"]?.toLocaleString()} • {client["Total Pedidos"]} pedidos
                          </p>
                        </div>
                        {getDifficultyBadge(client["Puntuación Dificultad"])}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      Productos Más Populares
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analysisData.productsData?.slice(0, 5).map((product: any, index: number) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                        <div>
                          <p className="font-medium">{product.Producto}</p>
                          <p className="text-sm text-muted-foreground">{product["Total Pedidos"]} menciones</p>
                        </div>
                        {getPopularityBadge(product.Popularidad)}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="visualizations" className="space-y-6">
              {(() => {
                const chartData = prepareChartData(analysisData)
                return (
                  <>
                    {/* Título y explicación */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          📊 Panel de Visualizaciones para Decisiones de Producción
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">
                          Estas visualizaciones te ayudan a tomar decisiones informadas sobre qué productos producir,
                          cuándo producir más, y cómo optimizar tu operación basándote en datos reales de tus clientes.
                        </p>
                      </CardContent>
                    </Card>

                    {/* Gráficos principales */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Productos más demandados */}
                      <Card>
                        <CardHeader>
                          <CardTitle>🥖 Productos Más Demandados</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Prioriza la producción de estos productos para maximizar ventas
                          </p>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={chartData.productChartData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="cantidad" fill="#8884d8" />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      {/* Distribución de productos (Pie) */}
                      <Card>
                        <CardHeader>
                          <CardTitle>📈 Distribución de Demanda por Producto</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Porcentaje de participación de cada producto en el total de pedidos
                          </p>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={chartData.productChartData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="cantidad"
                              >
                                {chartData.productChartData.map((entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      {/* Clientes por valor */}
                      <Card>
                        <CardHeader>
                          <CardTitle>💰 Top 10 Clientes por Valor</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Identifica tus clientes más valiosos para atención prioritaria
                          </p>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={chartData.clientValueData} layout="horizontal">
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" />
                              <YAxis dataKey="name" type="category" width={100} />
                              <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, "Valor Total"]} />
                              <Bar dataKey="valor" fill="#00C49F" />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      {/* Actividad por hora */}
                      <Card>
                        <CardHeader>
                          <CardTitle>⏰ Actividad por Hora del Día</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Optimiza horarios de producción y atención al cliente
                          </p>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={chartData.hourlyData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="hora" />
                              <YAxis />
                              <Tooltip />
                              <Area
                                type="monotone"
                                dataKey="actividad"
                                stroke="#FFBB28"
                                fill="#FFBB28"
                                fillOpacity={0.6}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      {/* Actividad por día de la semana */}
                      <Card>
                        <CardHeader>
                          <CardTitle>📅 Actividad por Día de la Semana</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Planifica producción semanal basada en demanda histórica
                          </p>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={chartData.dailyData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="dia" />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="actividad" fill="#FF8042" />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      {/* Distribución de dificultad de clientes */}
                      <Card>
                        <CardHeader>
                          <CardTitle>😤 Distribución de Dificultad de Clientes</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Identifica qué porcentaje de clientes requiere atención especial
                          </p>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={chartData.difficultyData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, value }) => `${name}: ${value}`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {chartData.difficultyData.map((entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Insights de producción */}
                    <Card>
                      <CardHeader>
                        <CardTitle>🎯 Insights para Decisiones de Producción</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="p-4 bg-blue-50 rounded-lg">
                            <h4 className="font-semibold text-blue-800 mb-2">📦 Productos Prioritarios</h4>
                            <ul className="text-sm space-y-1">
                              {chartData.productChartData.slice(0, 3).map((product: any, index: number) => (
                                <li key={index}>
                                  • {product.name} ({product.cantidad} pedidos)
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="p-4 bg-green-50 rounded-lg">
                            <h4 className="font-semibold text-green-800 mb-2">⏰ Horarios Pico</h4>
                            <ul className="text-sm space-y-1">
                              {chartData.hourlyData
                                .sort((a: any, b: any) => b.actividad - a.actividad)
                                .slice(0, 3)
                                .map((hour: any, index: number) => (
                                  <li key={index}>
                                    • {hour.hora} ({hour.actividad} mensajes)
                                  </li>
                                ))}
                            </ul>
                          </div>

                          <div className="p-4 bg-yellow-50 rounded-lg">
                            <h4 className="font-semibold text-yellow-800 mb-2">📈 Días de Mayor Demanda</h4>
                            <ul className="text-sm space-y-1">
                              {chartData.dailyData
                                .sort((a: any, b: any) => b.actividad - a.actividad)
                                .slice(0, 3)
                                .map((day: any, index: number) => (
                                  <li key={index}>
                                    • {day.dia} ({day.actividad} mensajes)
                                  </li>
                                ))}
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )
              })()}
            </TabsContent>

            <TabsContent value="clients">
              <Card>
                <CardHeader>
                  <CardTitle>Análisis Completo de Todos los Clientes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Pedidos</TableHead>
                          <TableHead>Total Gastado</TableHead>
                          <TableHead>Prom. Piezas</TableHead>
                          <TableHead>Frecuencia</TableHead>
                          <TableHead>Tiempo Resp.</TableHead>
                          <TableHead>Dificultad</TableHead>
                          <TableHead>Satisfacción</TableHead>
                          <TableHead>Riesgo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analysisData.clientsData?.map((client: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{client["Nombre Cliente"]}</TableCell>
                            <TableCell>{client["Total Pedidos"]}</TableCell>
                            <TableCell>${client["Total Gastado"]?.toLocaleString()}</TableCell>
                            <TableCell>{client["Promedio Piezas/Pedido"]}</TableCell>
                            <TableCell>{client["Frecuencia Semanal"]}/sem</TableCell>
                            <TableCell>{client["Tiempo Respuesta (hrs)"]}h</TableCell>
                            <TableCell>{getDifficultyBadge(client["Puntuación Dificultad"])}</TableCell>
                            <TableCell>
                              <Badge variant={client["Puntuación Satisfacción"] > 0 ? "default" : "destructive"}>
                                {client["Puntuación Satisfacción"]}
                              </Badge>
                            </TableCell>
                            <TableCell>{getRiskBadge(client["Nivel de Riesgo"] || "low")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="individual">
              <div className="space-y-6">
                {analysisData.clientsData?.map((client: any, index: number) => {
                  const clientChartData = prepareClientChartData(client, analysisData)
                  return (
                    <Card key={index}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>{client["Nombre Cliente"]}</span>
                          <div className="flex gap-2">
                            {getDifficultyBadge(client["Puntuación Dificultad"])}
                            {getRiskBadge(client["Nivel de Riesgo"] || "low")}
                            <Badge variant={client["Puntuación Satisfacción"] > 0 ? "default" : "destructive"}>
                              Satisfacción: {client["Puntuación Satisfacción"]}
                            </Badge>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {/* Visualizaciones del cliente */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                          {/* Evolución temporal del cliente */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">📈 Evolución de Pedidos</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={clientChartData.monthlyData}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="month" />
                                  <YAxis />
                                  <Tooltip />
                                  <Line type="monotone" dataKey="pedidos" stroke="#8884d8" strokeWidth={2} />
                                  <Line type="monotone" dataKey="piezas" stroke="#82ca9d" strokeWidth={2} />
                                </LineChart>
                              </ResponsiveContainer>
                            </CardContent>
                          </Card>

                          {/* Productos preferidos del cliente */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">🥖 Productos Preferidos</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                  <Pie
                                    data={clientChartData.clientProductData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, porcentaje }) => `${name}: ${porcentaje}%`}
                                    outerRadius={60}
                                    fill="#8884d8"
                                    dataKey="cantidad"
                                  >
                                    {clientChartData.clientProductData.map((entry: any, idx: number) => (
                                      <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                                    ))}
                                  </Pie>
                                  <Tooltip />
                                </PieChart>
                              </ResponsiveContainer>
                            </CardContent>
                          </Card>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Métricas del cliente */}
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-semibold mb-2">💰 Métricas de Negocio</h4>
                              <div className="text-sm space-y-1">
                                <p>
                                  <strong>Total Pedidos:</strong> {client["Total Pedidos"]}
                                </p>
                                <p>
                                  <strong>Total Gastado:</strong> ${client["Total Gastado"]?.toLocaleString()}
                                </p>
                                <p>
                                  <strong>Valor Promedio:</strong> ${client["Valor Promedio Pedido"]?.toLocaleString()}
                                </p>
                                <p>
                                  <strong>Frecuencia:</strong> {client["Frecuencia Semanal"]} pedidos/semana
                                </p>
                                <p>
                                  <strong>Último Pedido:</strong> {client["Último Pedido"]}
                                </p>
                              </div>
                            </div>

                            <div>
                              <h4 className="font-semibold mb-2">📊 Productos Preferidos (Detalle)</h4>
                              <div className="text-sm space-y-1">
                                {client["Productos Detallados"]?.slice(0, 5).map((product: any, idx: number) => (
                                  <div key={idx} className="flex justify-between">
                                    <span>{product.product}</span>
                                    <Badge variant="outline">{product.percentage}%</Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Análisis GPT */}
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-semibold mb-2 flex items-center gap-2">🤖 Análisis con IA</h4>
                              <div className="space-y-3">
                                <div>
                                  <h5 className="text-sm font-medium text-blue-600">Perfil de Comportamiento</h5>
                                  <p className="text-sm text-muted-foreground">
                                    {client["Perfil de Comportamiento"] || "Análisis en proceso..."}
                                  </p>
                                </div>

                                <div>
                                  <h5 className="text-sm font-medium text-green-600">Valor para el Negocio</h5>
                                  <p className="text-sm text-muted-foreground">
                                    {client["Valor para Negocio"] || "Evaluando..."}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div>
                              <h4 className="font-semibold mb-2">🎯 Recomendaciones</h4>
                              <div className="space-y-1">
                                {client["Recomendaciones GPT"]?.slice(0, 3).map((rec: string, idx: number) => (
                                  <div
                                    key={idx}
                                    className="text-sm p-2 bg-green-50 rounded border-l-2 border-green-200"
                                  >
                                    {rec}
                                  </div>
                                )) || <p className="text-sm text-muted-foreground">Generando recomendaciones...</p>}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Alertas */}
                        <div className="mt-4 space-y-2">
                          {client["Problemas Pago"] > 0 && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                              ⚠️ <strong>Alerta de Pago:</strong> {client["Problemas Pago"]} problema(s) detectado(s)
                            </div>
                          )}

                          {client["Tiempo Respuesta (hrs)"] > 4 && (
                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
                              ⏰ <strong>Respuesta Lenta:</strong> {client["Tiempo Respuesta (hrs)"]} horas promedio
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </TabsContent>

            <TabsContent value="gpt-insights">
              {(() => {
                const predictiveAnalysis = performPredictiveAnalysis(analysisData)

                if (!predictiveAnalysis) {
                  return (
                    <Card>
                      <CardContent className="p-6 text-center">
                        <p>No hay suficientes datos para análisis predictivo</p>
                      </CardContent>
                    </Card>
                  )
                }

                return (
                  <div className="space-y-6">
                    {/* Resumen Ejecutivo Mejorado */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">🎯 Resumen Ejecutivo Estratégico</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                          <div className="p-4 bg-blue-50 rounded-lg text-center">
                            <h3 className="font-bold text-2xl text-blue-600">
                              {Object.values(predictiveAnalysis.clientSegments).flat().length}
                            </h3>
                            <p className="text-sm text-blue-700">Clientes Segmentados</p>
                          </div>
                          <div className="p-4 bg-red-50 rounded-lg text-center">
                            <h3 className="font-bold text-2xl text-red-600">
                              {predictiveAnalysis.churnRisk.filter((c: any) => c.riskLevel === "Alto").length}
                            </h3>
                            <p className="text-sm text-red-700">Alto Riesgo Abandono</p>
                          </div>
                          <div className="p-4 bg-green-50 rounded-lg text-center">
                            <h3 className="font-bold text-2xl text-green-600">
                              {predictiveAnalysis.growthOpportunities.filter((o: any) => o.priority === "Alta").length}
                            </h3>
                            <p className="text-sm text-green-700">Oportunidades Alta Prioridad</p>
                          </div>
                          <div className="p-4 bg-purple-50 rounded-lg text-center">
                            <h3 className="font-bold text-2xl text-purple-600">
                              $
                              {Math.round(
                                predictiveAnalysis.growthOpportunities.reduce(
                                  (sum: number, o: any) => sum + o.potentialValue,
                                  0,
                                ) / 1000,
                              )}
                              k
                            </h3>
                            <p className="text-sm text-purple-700">Potencial de Crecimiento</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Segmentación de Clientes */}
                    <Card>
                      <CardHeader>
                        <CardTitle>👥 Segmentación Automática de Clientes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                          {Object.entries(predictiveAnalysis.clientSegments).map(
                            ([segmentName, clients]: [string, any]) => (
                              <div key={segmentName} className="border rounded-lg p-4">
                                <h4 className="font-semibold mb-2 capitalize">
                                  {segmentName === "vip"
                                    ? "VIP"
                                    : segmentName === "regular"
                                      ? "Regulares"
                                      : segmentName === "occasional"
                                        ? "Ocasionales"
                                        : segmentName === "problematic"
                                          ? "Problemáticos"
                                          : "Nuevos"}
                                  ({clients.length})
                                </h4>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                  {clients.slice(0, 5).map((client: any, idx: number) => (
                                    <div
                                      key={idx}
                                      className="text-sm p-2 rounded"
                                      style={{ backgroundColor: client.segmentColor + "20" }}
                                    >
                                      <p className="font-medium">{client["Nombre Cliente"]}</p>
                                      <p className="text-xs text-muted-foreground">
                                        ${client["Total Gastado"]?.toLocaleString()} • {client["Total Pedidos"]} pedidos
                                      </p>
                                    </div>
                                  ))}
                                  {clients.length > 5 && (
                                    <p className="text-xs text-muted-foreground">+{clients.length - 5} más...</p>
                                  )}
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Predicción de Demanda */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>📈 Predicción de Demanda Semanal</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {predictiveAnalysis.demandPrediction?.weeklyTrends.map((day: any, idx: number) => (
                              <div key={idx} className="flex justify-between items-center p-3 border rounded">
                                <div>
                                  <p className="font-medium">{day.day}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Histórico: {day.avgDemand} piezas • Confianza: {day.confidence}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-lg">{day.predictedDemand}</p>
                                  <p className="text-sm text-green-600">Predicción</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>🥖 Tendencias de Productos</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {predictiveAnalysis.demandPrediction?.productTrends.map((product: any, idx: number) => (
                              <div key={idx} className="p-3 border rounded">
                                <div className="flex justify-between items-start mb-2">
                                  <p className="font-medium">{product.product}</p>
                                  <Badge
                                    variant={
                                      product.trend > 0 ? "default" : product.trend < -10 ? "destructive" : "secondary"
                                    }
                                  >
                                    {product.trend > 0 ? "+" : ""}
                                    {product.trend}%
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mb-1">Estado: {product.predictedGrowth}</p>
                                <p className="text-sm font-medium text-blue-600">💡 {product.recommendation}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Análisis de Riesgo de Abandono */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">⚠️ Clientes en Riesgo de Abandono</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {predictiveAnalysis.churnRisk.length === 0 ? (
                          <p className="text-center text-muted-foreground py-4">
                            ¡Excelente! No hay clientes en alto riesgo de abandono
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {predictiveAnalysis.churnRisk.slice(0, 10).map((client: any, idx: number) => (
                              <div key={idx} className="p-4 border rounded-lg">
                                <div className="flex justify-between items-start mb-2">
                                  <h4 className="font-medium">{client.client}</h4>
                                  <Badge variant={client.riskLevel === "Alto" ? "destructive" : "secondary"}>
                                    Riesgo {client.riskLevel}
                                  </Badge>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                  <div>
                                    <p className="text-muted-foreground">Días sin pedido:</p>
                                    <p className="font-medium">{client.daysSinceLastOrder} días</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Esperado cada:</p>
                                    <p className="font-medium">{client.expectedDays} días</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Acción recomendada:</p>
                                    <p className="font-medium text-blue-600">{client.recommendation}</p>
                                  </div>
                                </div>
                                {client.reasons.length > 0 && (
                                  <div className="mt-2">
                                    <p className="text-sm text-muted-foreground">Factores de riesgo:</p>
                                    <ul className="text-sm list-disc list-inside">
                                      {client.reasons.map((reason: string, ridx: number) => (
                                        <li key={ridx}>{reason}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Oportunidades de Crecimiento */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">🚀 Oportunidades de Crecimiento</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {predictiveAnalysis.growthOpportunities.slice(0, 10).map((opportunity: any, idx: number) => (
                            <div key={idx} className="p-4 border rounded-lg">
                              <div className="flex justify-between items-start mb-3">
                                <h4 className="font-medium">{opportunity.client}</h4>
                                <div className="text-right">
                                  <Badge
                                    variant={
                                      opportunity.priority === "Alta"
                                        ? "default"
                                        : opportunity.priority === "Media"
                                          ? "secondary"
                                          : "outline"
                                    }
                                  >
                                    {opportunity.priority} Prioridad
                                  </Badge>
                                  <p className="text-sm text-green-600 mt-1">
                                    +{opportunity.growthPotential}% potencial
                                  </p>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Valor actual:</p>
                                  <p className="font-medium">${opportunity.currentValue.toLocaleString()}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Potencial estimado:</p>
                                  <p className="font-medium text-green-600">
                                    +${opportunity.potentialValue.toLocaleString()}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Valor total proyectado:</p>
                                  <p className="font-medium text-blue-600">
                                    ${(opportunity.currentValue + opportunity.potentialValue).toLocaleString()}
                                  </p>
                                </div>
                              </div>

                              <div>
                                <p className="text-sm text-muted-foreground mb-1">Oportunidades identificadas:</p>
                                <ul className="text-sm list-disc list-inside space-y-1">
                                  {opportunity.opportunities.map((opp: string, oidx: number) => (
                                    <li key={oidx} className="text-blue-600">
                                      {opp}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Análisis de Ciclo de Vida */}
                    <Card>
                      <CardHeader>
                        <CardTitle>🔄 Análisis de Ciclo de Vida de Clientes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                          {["Nuevo Cliente", "Cliente Activo", "Cliente Regular", "En Riesgo", "Inactivo"].map(
                            (stage) => {
                              const stageClients = predictiveAnalysis.lifecycleAnalysis.filter(
                                (c: any) => c.stage === stage,
                              )
                              return (
                                <div key={stage} className="border rounded-lg p-4">
                                  <h4 className="font-semibold mb-2">
                                    {stage} ({stageClients.length})
                                  </h4>
                                  <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {stageClients.slice(0, 5).map((client: any, idx: number) => (
                                      <div key={idx} className="text-sm p-2 rounded border">
                                        <p className="font-medium">{client.client}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {client.daysSinceLastOrder} días • ${client.totalValue.toLocaleString()}
                                        </p>
                                        <p className="text-xs text-blue-600 mt-1">{client.nextAction}</p>
                                      </div>
                                    ))}
                                    {stageClients.length > 5 && (
                                      <p className="text-xs text-muted-foreground">+{stageClients.length - 5} más...</p>
                                    )}
                                  </div>
                                </div>
                              )
                            },
                          )}
                        </div>
                      </CardContent>
                    </Card>
                    {/* Análisis de Recuperación de Clientes */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          💰 Análisis de Recuperación de Clientes Inactivos
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {predictiveAnalysis.recoveryAnalysis.length === 0 ? (
                          <p className="text-center text-muted-foreground py-4">
                            ¡Felicidades! No hay clientes inactivos con potencial de recuperación.
                          </p>
                        ) : (
                          <div className="space-y-4">
                            {predictiveAnalysis.recoveryAnalysis.slice(0, 10).map((client: any, idx: number) => (
                              <div key={idx} className="p-4 border rounded-lg">
                                <div className="flex justify-between items-start mb-3">
                                  <h4 className="font-medium">{client.client}</h4>
                                  <div className="text-right">
                                    <Badge
                                      variant={
                                        client.priority === "Alta"
                                          ? "default"
                                          : client.priority === "Media"
                                            ? "secondary"
                                            : "outline"
                                      }
                                    >
                                      {client.priority} Prioridad
                                    </Badge>
                                    <p className="text-sm text-green-600 mt-1">ROI: +{client.recoveryROI}%</p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3 text-sm">
                                  <div>
                                    <p className="text-muted-foreground">Valor actual:</p>
                                    <p className="font-medium">${client.currentValue.toLocaleString()}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">CLV proyectado:</p>
                                    <p className="font-medium text-green-600">
                                      +${client.predictedCLV.toLocaleString()}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Costo recuperación:</p>
                                    <p className="font-medium text-red-600">
                                      ${client.estimatedRecoveryCost.toLocaleString()}
                                    </p>
                                  </div>
                                </div>

                                <div>
                                  <p className="text-sm text-muted-foreground mb-1">Estrategia recomendada:</p>
                                  <p className="text-sm text-blue-600">{client.strategy}</p>
                                </div>

                                {client.riskFactors.length > 0 && (
                                  <div className="mt-2">
                                    <p className="text-sm text-muted-foreground">Factores de riesgo:</p>
                                    <ul className="text-sm list-disc list-inside">
                                      {client.riskFactors.map((factor: string, fidx: number) => (
                                        <li key={fidx}>{factor}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )
              })()}
            </TabsContent>

            <TabsContent value="products">
              <Card>
                <CardHeader>
                  <CardTitle>Análisis de Productos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead>Total Menciones</TableHead>
                          <TableHead>Popularidad</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analysisData.productsData?.map((product: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{product.Producto}</TableCell>
                            <TableCell>{product["Total Pedidos"]}</TableCell>
                            <TableCell>{getPopularityBadge(product.Popularidad)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trends">
              <Card>
                <CardHeader>
                  <CardTitle>Tendencias Temporales</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Hourly Trends */}
                    <div>
                      <h3 className="font-semibold mb-3">Actividad por Hora</h3>
                      <div className="space-y-2">
                        {analysisData.trendsData
                          ?.filter((trend: any) => trend.Tipo === "Hora")
                          .sort((a: any, b: any) => b.Actividad - a.Actividad)
                          .slice(0, 5)
                          .map((trend: any, index: number) => (
                            <div key={index} className="flex justify-between items-center">
                              <span className="text-sm">{trend.Periodo}</span>
                              <Badge variant="outline">{trend.Actividad}</Badge>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Daily Trends */}
                    <div>
                      <h3 className="font-semibold mb-3">Actividad por Día</h3>
                      <div className="space-y-2">
                        {analysisData.trendsData
                          ?.filter((trend: any) => trend.Tipo === "Día Semana")
                          .sort((a: any, b: any) => b.Actividad - a.Actividad)
                          .map((trend: any, index: number) => (
                            <div key={index} className="flex justify-between items-center">
                              <span className="text-sm">{trend.Periodo}</span>
                              <Badge variant="outline">{trend.Actividad}</Badge>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Monthly Trends */}
                    <div>
                      <h3 className="font-semibold mb-3">Actividad por Mes</h3>
                      <div className="space-y-2">
                        {analysisData.trendsData
                          ?.filter((trend: any) => trend.Tipo === "Mes")
                          .sort((a: any, b: any) => b.Actividad - a.Actividad)
                          .slice(0, 5)
                          .map((trend: any, index: number) => (
                            <div key={index} className="flex justify-between items-center">
                              <span className="text-sm">{trend.Periodo}</span>
                              <Badge variant="outline">{trend.Actividad}</Badge>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="export">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Exportar Datos Completos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      variant="outline"
                      onClick={() => downloadCSV(analysisData.clientsData || [], "analisis_completo_clientes.csv")}
                    >
                      Análisis Completo de Clientes (CSV)
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => downloadCSV(analysisData.ordersData || [], "historial_completo_pedidos.csv")}
                    >
                      Historial Completo de Pedidos (CSV)
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => downloadCSV(analysisData.productsData || [], "analisis_productos.csv")}
                    >
                      Análisis de Productos (CSV)
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => downloadCSV(analysisData.trendsData || [], "tendencias_temporales.csv")}
                    >
                      Tendencias Temporales (CSV)
                    </Button>
                  </div>

                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-2">Resumen del Análisis Completo:</h4>
                    <ul className="text-sm space-y-1">
                      <li>
                        • <strong>Conversaciones procesadas:</strong> {allConversations.length}
                      </li>
                      <li>
                        • <strong>Clientes analizados:</strong> {analysisData.totalClients}
                      </li>
                      <li>
                        • <strong>Pedidos procesados:</strong> {analysisData.totalOrders}
                      </li>
                      <li>
                        • <strong>Piezas totales:</strong> {analysisData.totalPieces}
                      </li>
                      <li>
                        • <strong>Ingresos estimados:</strong> $
                        {analysisData.clientsData
                          ?.reduce((sum: number, c: any) => sum + (c["Total Gastado"] || 0), 0)
                          .toLocaleString()}
                      </li>
                      <li>
                        • <strong>Tiempo promedio de respuesta:</strong> {analysisData.avgResponseTime} horas
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}
