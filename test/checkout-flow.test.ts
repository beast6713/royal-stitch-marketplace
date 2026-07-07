import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../app/api/checkout/route';

vi.mock("server-only", () => ({}));

// Mock dependencies
vi.mock('@/lib/cart', () => ({
  getCartSnapshot: vi.fn().mockResolvedValue({
    items: [
      {
        id: 'cart-1',
        quantity: 1,
        product: { id: 'prod-1', sellerId: 'seller-1', price: 50 },
        customMargin: 0
      }
    ],
    total: 50
  })
}));

vi.mock('@/lib/orders', () => ({
  createOrdersFromCart: vi.fn().mockResolvedValue([
    {
      id: 'order-1',
      total: 50,
      paymentMethod: 'cod',
      status: 'pending',
      items: [
        {
          id: 'item-1',
          sellerId: 'seller-1',
          productId: 'prod-1',
          unitPrice: 50,
          quantity: 1,
          customMargin: 0
        }
      ]
    }
  ])
}));

vi.mock('@/lib/viewer', () => ({
  getViewerIdentity: vi.fn().mockResolvedValue({
    buyerId: 'buyer-1',
    isGuest: false
  }),
  GUEST_BUYER_COOKIE: 'mock-cookie'
}));

vi.mock('@/lib/telemetry-store', () => ({
  recordTelemetryEvent: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}));

const createMockRequest = (body: any) => {
  return new NextRequest('http://localhost/api/checkout', {
    method: 'POST',
    body: JSON.stringify(body)
  });
};

describe('Checkout API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 for invalid payload', async () => {
    const request = createMockRequest({ paymentMethod: 'invalid-method' });
    const response = await POST(request);
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid checkout payload.');
  });

  it('should process valid COD checkout and return 201', async () => {
    const request = createMockRequest({
      paymentMethod: 'cod',
      shippingAddress: '123 Test Street, Test City, 560001'
    });
    const response = await POST(request);
    
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.orders).toHaveLength(1);
    expect(data.orders[0].paymentMethod).toBe('cod');
    expect(data.orders[0].status).toBe('pending');
  });
});
