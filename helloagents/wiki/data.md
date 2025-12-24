# 数据模型（localStorage）

> 本项目默认将交互数据保存在浏览器 `localStorage` 中。生产化请迁移到服务端并加鉴权。

## Key 一览

| Key | 类型 | 说明 |
|-----|------|------|
| `cart` | `Array<{id, quantity, price, name, ...}>` | 购物车条目（示例） |
| `favorites` | `string[]` | 收藏商品 ID 列表 |
| `compare` | `string[]` | 对比商品 ID 列表（最多 3） |
| `orders` | `Array<Order>` | 模拟订单列表 |
| `shippingRegion` | `string` | 配送地区 key |
| `promotion` | `Promotion` | 优惠码/促销信息 |
| `rewards` | `{points:number}` | 积分状态 |
| `addressBook` | `Array<Address>` | 常用地址簿 |
| `priceAlerts` | `Array<Alert>` | 降价提醒（示例） |
| `theme` | `'light' | 'dark'` | 主题偏好 |

## 订单模型（示意）

```ts
type Order = {
  id: string;
  createdAt: string; // ISO
  items: Array<{ productId: string; quantity: number; price: number }>;
  totals: {
    subtotal: number;
    discount: number;
    shipping: number;
    total: number;
  };
  address: { name: string; phone: string; address: string };
};
```

