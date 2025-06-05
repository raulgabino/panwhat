import { kv } from "@vercel/kv"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const { jobId } = params
    const { searchParams } = new URL(request.url)
    const part = searchParams.get("part")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")

    if (!jobId) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 })
    }

    // Verificar que el trabajo esté completado
    const jobStatus = (await kv.get(`job:status:${jobId}`)) as any
    if (!jobStatus || jobStatus.status !== "completed") {
      return NextResponse.json({ error: "Job not completed" }, { status: 400 })
    }

    // Leer el resultado completo del análisis desde Vercel KV
    const analysisResult = (await kv.get(`job:result:${jobId}`)) as any

    if (!analysisResult) {
      return NextResponse.json({ error: "Results not found" }, { status: 404 })
    }

    // Manejar diferentes tipos de solicitudes
    switch (part) {
      case "summary":
        // Devolver solo las métricas principales
        return NextResponse.json({
          totalClients: analysisResult.totalClients,
          totalSpecificOrders: analysisResult.totalSpecificOrders,
          totalGeneralOrders: analysisResult.totalGeneralOrders,
          totalSpecificPieces: analysisResult.totalSpecificPieces,
          totalGeneralPieces: analysisResult.totalGeneralPieces,
          totalOrders: analysisResult.totalOrders,
          segmentStats: analysisResult.segmentStats || {},
        })

      case "clients":
        // Paginar clientes
        const clients = analysisResult.clientsData || []
        const totalClients = clients.length
        const totalPages = Math.ceil(totalClients / limit)
        const startIndex = (page - 1) * limit
        const endIndex = startIndex + limit
        const paginatedClients = clients.slice(startIndex, endIndex)

        return NextResponse.json({
          clients: paginatedClients,
          currentPage: page,
          totalPages,
          totalClients,
        })

      case "products":
        // Paginar productos
        const products = analysisResult.productsData || []
        const totalProducts = products.length
        const totalProductPages = Math.ceil(totalProducts / limit)
        const productStartIndex = (page - 1) * limit
        const productEndIndex = productStartIndex + limit
        const paginatedProducts = products.slice(productStartIndex, productEndIndex)

        return NextResponse.json({
          products: paginatedProducts,
          currentPage: page,
          totalPages: totalProductPages,
        })

      case "orders":
        // Paginar pedidos
        const orders = analysisResult.ordersData || []
        const totalOrders = orders.length
        const totalOrderPages = Math.ceil(totalOrders / limit)
        const orderStartIndex = (page - 1) * limit
        const orderEndIndex = orderStartIndex + limit
        const paginatedOrders = orders.slice(orderStartIndex, orderEndIndex)

        return NextResponse.json({
          orders: paginatedOrders,
          currentPage: page,
          totalPages: totalOrderPages,
        })

      case "trends":
        // Devolver tendencias completas (no necesitan paginación)
        return NextResponse.json({
          trends: analysisResult.trendsData || [],
        })

      case "predictive":
        // Devolver análisis predictivo
        return NextResponse.json({
          predictiveAnalysis: analysisResult.predictiveAnalysis || null,
        })

      default:
        return NextResponse.json({ error: "Invalid part parameter" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error getting job results:", error)
    return NextResponse.json({ error: "Failed to get job results" }, { status: 500 })
  }
}
