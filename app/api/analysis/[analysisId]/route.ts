import { type NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { join } from "path"

export async function GET(request: NextRequest, { params }: { params: { analysisId: string } }) {
  try {
    const { analysisId } = params
    const { searchParams } = new URL(request.url)
    const part = searchParams.get("part")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")

    const filePath = join("/tmp", `${analysisId}.json`)

    // Endpoint de Estado
    if (part === "status") {
      try {
        await readFile(filePath)
        return NextResponse.json({ status: "completed" })
      } catch (error) {
        return NextResponse.json({ status: "processing" })
      }
    }

    // Leer el archivo JSON para otros endpoints
    let analysisData
    try {
      const fileContent = await readFile(filePath, "utf-8")
      analysisData = JSON.parse(fileContent)
    } catch (error) {
      return NextResponse.json({ error: "Análisis no encontrado o aún procesando" }, { status: 404 })
    }

    // Verificar si hay error en el análisis
    if (analysisData.error) {
      return NextResponse.json({ error: analysisData.error }, { status: 400 })
    }

    // Endpoint de Resumen
    if (part === "summary") {
      const summary = {
        totalClients: analysisData.totalClients,
        totalOrders: analysisData.totalOrders,
        totalSpecificOrders: analysisData.totalSpecificOrders,
        totalGeneralOrders: analysisData.totalGeneralOrders,
        totalPieces: analysisData.totalPieces,
        totalSpecificPieces: analysisData.totalSpecificPieces,
        totalGeneralPieces: analysisData.totalGeneralPieces,
        totalCambios: analysisData.totalCambios,
        totalRevenue: analysisData.totalRevenue,
        avgResponseTime: analysisData.avgResponseTime,
        segmentStats: analysisData.segmentStats,
        churnRiskStats: analysisData.churnRiskStats,
        orderCategoryStats: analysisData.orderCategoryStats,
        exclusionStats: analysisData.exclusionStats,
        packageOrderStats: analysisData.packageOrderStats,
        isAccumulative: analysisData.isAccumulative,
        totalConversationsProcessed: analysisData.totalConversationsProcessed,
      }
      return NextResponse.json(summary)
    }

    // Endpoint de Clientes (Paginado)
    if (part === "clients") {
      const clients = analysisData.clientsData || []
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      const paginatedClients = clients.slice(startIndex, endIndex)
      const totalPages = Math.ceil(clients.length / limit)

      return NextResponse.json({
        clients: paginatedClients,
        totalPages,
        currentPage: page,
        totalClients: clients.length,
      })
    }

    // Endpoint de Productos (Paginado)
    if (part === "products") {
      const products = analysisData.productsData || []
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      const paginatedProducts = products.slice(startIndex, endIndex)
      const totalPages = Math.ceil(products.length / limit)

      return NextResponse.json({
        products: paginatedProducts,
        totalPages,
        currentPage: page,
        totalProducts: products.length,
      })
    }

    // Endpoint de Pedidos (Paginado)
    if (part === "orders") {
      const orders = analysisData.ordersData || []
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      const paginatedOrders = orders.slice(startIndex, endIndex)
      const totalPages = Math.ceil(orders.length / limit)

      return NextResponse.json({
        orders: paginatedOrders,
        totalPages,
        currentPage: page,
        totalOrders: orders.length,
      })
    }

    // Endpoint de Tendencias
    if (part === "trends") {
      return NextResponse.json({
        trends: analysisData.trendsData || [],
      })
    }

    // Endpoint de Tags de Conversación
    if (part === "conversation-tags") {
      return NextResponse.json({
        tags: analysisData.conversationTags || [],
      })
    }

    return NextResponse.json({ error: "Parte no válida especificada" }, { status: 400 })
  } catch (error) {
    console.error("Error serving analysis data:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
