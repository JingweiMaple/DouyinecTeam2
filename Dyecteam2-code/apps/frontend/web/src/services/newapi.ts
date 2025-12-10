// client/newapi.ts
// TypeScript 前端调用代码

// 订单接口类型定义

interface Order {
  id: number;
  order_no: string;
  order_name: string;
  delivery_hours: number;
  created_at: string;
  recv_city: string;
  region: string;
  ship_city: string;
  status: 'normal' | 'abnormal';
  order_status: number;
  remark: string;
  unit_price: number;
  quantity: number;
  total_price: number;
  receiver_name: string;
  receiver_address: string;
  receiver_coords: string;
  logistics_no: string;
  logistics_company: string;
}

// API响应类型
interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  message?: string;
}

interface PaginatedResponse {
  orders: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface StatsResponse {
  basic: {
    total_orders: number;
    abnormal_count: number;
    total_revenue: number;
    avg_order_value: number;
  };
  status_distribution: Array<{
    status: string;
    count: number;
    avg_price: number;
  }>;
  city_distribution: Array<{
    recv_city: string;
    order_count: number;
    total_revenue: number;
  }>;
}

export class LogisticsAPI {
  private baseURL: string;

  constructor(baseURL: string = 'http://localhost:3001/api') {
    this.baseURL = baseURL;
  }

  // 获取所有订单
  async getAllOrders(): Promise<Order[]> {
    try {
      const response = await fetch(`${this.baseURL}/orders`);
      const result: ApiResponse<Order[]> = await response.json();

      if (!result.success) {
        throw new Error(result.message || '获取订单失败');
      }

      return result.data;
    } catch (error) {
      console.error('获取订单失败:', error);
      throw error;
    }
  }



  // 分页获取订单
  async getOrdersPaged(page: number = 1, limit: number = 10): Promise<PaginatedResponse> {
    try {
      const response = await fetch(`${this.baseURL}/orders/paged?page=${page}&limit=${limit}`);
      const result: ApiResponse<PaginatedResponse> = await response.json();

      if (!result.success) {
        throw new Error(result.message || '获取订单失败');
      }

      return result.data;
    } catch (error) {
      console.error('获取分页订单失败:', error);
      throw error;
    }
  }

  // 筛选获取订单
  async getOrdersFiltered(filters: {
    status?: string;
    order_status?: number;
    recv_city?: string;
    logistics_company?: string;
  }): Promise<Order[]> {
    try {
      // 构建查询参数
      const params = new URLSearchParams();

      if (filters.status) params.append('status', filters.status);
      if (filters.order_status !== undefined) params.append('order_status', filters.order_status.toString());
      if (filters.recv_city) params.append('recv_city', filters.recv_city);
      if (filters.logistics_company) params.append('logistics_company', filters.logistics_company);

      const response = await fetch(`${this.baseURL}/orders/filtered?${params.toString()}`);
      const result: ApiResponse<Order[]> = await response.json();

      if (!result.success) {
        throw new Error(result.message || '获取筛选订单失败');
      }

      return result.data;
    } catch (error) {
      console.error('获取筛选订单失败:', error);
      throw error;
    }
  }

  // 获取统计信息
  async getStats(): Promise<StatsResponse> {
    try {
      const response = await fetch(`${this.baseURL}/orders/stats`);
      const result: ApiResponse<StatsResponse> = await response.json();

      if (!result.success) {
        throw new Error(result.message || '获取统计信息失败');
      }

      return result.data;
    } catch (error) {
      console.error('获取统计信息失败:', error);
      throw error;
    }
  }

  // 健康检查
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/health`);
      const result = await response.json();
      return result.success === true;
    } catch (error) {
      console.error('健康检查失败:', error);
      return false;
    }
  }
}

// 创建实例
export const logisticsAPI = new LogisticsAPI();

// 使用示例
export async function demoUsage() {
  const api = new LogisticsAPI();

  console.log('开始演示 API 调用...');

  try {
    // 1. 健康检查
    const isHealthy = await api.healthCheck();
    console.log('服务健康状态:', isHealthy ? '正常' : '异常');

    if (!isHealthy) return;

    // 2. 获取所有订单（前5条）
    const allOrders = await api.getAllOrders();
    console.log(`总订单数: ${allOrders.length}`);
    console.log('前5条订单:', allOrders.slice(0, 5));

    // 3. 分页获取订单
    const page1 = await api.getOrdersPaged(1, 5);
    console.log('\n第1页订单（每页5条）:');
    console.log(`页码: ${page1.pagination.page}`);
    console.log(`每页: ${page1.pagination.limit}`);
    console.log(`总数: ${page1.pagination.total}`);
    console.log(`总页数: ${page1.pagination.totalPages}`);

    // 4. 筛选获取订单
    const normalOrders = await api.getOrdersFiltered({ status: 'normal' });
    console.log(`\n正常状态订单数: ${normalOrders.length}`);

    const shanghaiOrders = await api.getOrdersFiltered({ recv_city: '上海' });
    console.log(`上海地区订单数: ${shanghaiOrders.length}`);

    // 5. 获取统计信息
    const stats = await api.getStats();
    console.log('\n统计信息:');
    console.log(`总订单数: ${stats.basic.total_orders}`);
    console.log(`异常订单数: ${stats.basic.abnormal_count}`);
    console.log(`总营收: ¥${stats.basic.total_revenue.toFixed(2)}`);
    console.log(`平均订单金额: ¥${stats.basic.avg_order_value.toFixed(2)}`);

  } catch (error) {
    console.error('演示失败:', error);
  }
}

// 如果需要立即执行演示
// demoUsage();
// logistics.ts 或 logisticsApi.ts
// 定义类型
export interface UpdateStatusRequest {
  order_no: string;
  order_status: number;
}

export interface UpdateStatusResponse {
  success: boolean;
  message: string;
  data?: any;
  changes?: number;
}

export interface BatchUpdateRequest {
  order_nos: string[];
  order_status: number;
}

export interface BatchUpdateResponse {
  success: boolean;
  message: string;
  data: Array<{
    order_no: string;
    success: boolean;
    changes: number;
  }>;
  summary: {
    total: number;
    success: number;
    failed: number;
  };
}

// 订单服务类
export class OrderService {
  private baseURL: string;

  constructor(baseURL: string = 'http://localhost:3001/api') {
    this.baseURL = baseURL;
  }

  /**
   * 更新单个订单状态
   */
  async updateOrderStatus(request: UpdateStatusRequest): Promise<UpdateStatusResponse> {
    try {
      console.log(`正在更新订单状态: ${request.order_no} -> ${request.order_status}`);

      const response = await fetch(`${this.baseURL}/orders/update-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      const result = await response.json();

      if (result.success) {
        console.log(`✅ 订单 ${request.order_no} 状态更新成功`);
      } else {
        console.warn(`⚠ 订单更新失败: ${result.message}`);
      }

      return result;

    } catch (error) {
      console.error('❌ 更新订单状态时发生错误:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '网络请求失败'
      };
    }
  }

  /**
   * 验证订单编号格式
   */
  validateOrderNo(orderNo: string): { isValid: boolean; message?: string } {
    if (!orderNo || orderNo.trim() === '') {
      return {
        isValid: false,
        message: '订单编号不能为空'
      };
    }

    // 根据你的订单编号格式添加验证规则
    // 示例：订单编号以字母开头，后跟数字
    const pattern = /^[A-Za-z][A-Za-z0-9]*$/;
    if (!pattern.test(orderNo)) {
      return {
        isValid: false,
        message: '订单编号格式不正确（应以字母开头）'
      };
    }

    return { isValid: true };
  }

}
export const orderService = new OrderService();