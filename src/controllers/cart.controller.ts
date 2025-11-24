import type { Request, Response } from "express";
import CartModel from "../models/cart.model.js";
import ProductModel from "../models/product.model.js";

// 🛒 ALL CART OPERATIONS ARE USER ONLY (handled by authenticate middleware in routes)
export class CartController {
  
  // 📌 GET CART
  public async getCart(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;

      let cart = await CartModel.model
        .findOne({ userId })
        .populate("items.productId");

      if (!cart) {
        // Create empty cart if doesn't exist
        cart = await CartModel.model.create({ userId, items: [] });
      }

      // Calculate total
      const total = cart.items.reduce((sum, item: any) => {
        return sum + (item.productId?.price || 0) * item.quantity;
      }, 0);

      res.status(200).json({
        success: true,
        data: {
          cart,
          total,
          itemCount: cart.items.length,
        },
      });
    } catch (error: any) {
      console.error("❌ Get Cart Error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch cart",
      });
    }
  }

  // 📌 ADD TO CART
  public async addToCart(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const { productId, quantity = 1 } = req.body;

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: "Product ID is required",
        });
      }

      // Check if product exists and has stock
      const product = await ProductModel.model.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      if (product.stock < quantity) {
        return res.status(400).json({
          success: false,
          message: `Only ${product.stock} items available in stock`,
        });
      }

      // Find or create cart
      let cart = await CartModel.model.findOne({ userId });
      if (!cart) {
        cart = await CartModel.model.create({ userId, items: [] });
      }

      // Check if product already in cart
      const existingItemIndex = cart.items.findIndex(
        (item) => item.productId.toString() === productId
      );

      if (existingItemIndex > -1) {
        // Update quantity
        const newQuantity = cart.items[existingItemIndex].quantity + quantity;

        if (newQuantity > product.stock) {
          return res.status(400).json({
            success: false,
            message: `Cannot add more. Only ${product.stock} items available`,
          });
        }

        cart.items[existingItemIndex].quantity = newQuantity;
      } else {
        // Add new item
        cart.items.push({ productId, quantity });
      }

      await cart.save();
      await cart.populate("items.productId");

      res.status(200).json({
        success: true,
        message: "Product added to cart",
        data: cart,
      });
    } catch (error: any) {
      console.error("❌ Add to Cart Error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to add to cart",
      });
    }
  }

  // 📌 UPDATE CART ITEM QUANTITY
  public async updateCartItem(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const { productId, quantity } = req.body;

      if (!productId || quantity === undefined) {
        return res.status(400).json({
          success: false,
          message: "Product ID and quantity are required",
        });
      }

      if (quantity < 1) {
        return res.status(400).json({
          success: false,
          message: "Quantity must be at least 1",
        });
      }

      // Check product stock
      const product = await ProductModel.model.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      if (quantity > product.stock) {
        return res.status(400).json({
          success: false,
          message: `Only ${product.stock} items available in stock`,
        });
      }

      const cart = await CartModel.model.findOne({ userId });
      if (!cart) {
        return res.status(404).json({
          success: false,
          message: "Cart not found",
        });
      }

      const itemIndex = cart.items.findIndex(
        (item) => item.productId.toString() === productId
      );

      if (itemIndex === -1) {
        return res.status(404).json({
          success: false,
          message: "Product not in cart",
        });
      }

      cart.items[itemIndex].quantity = quantity;
      await cart.save();
      await cart.populate("items.productId");

      res.status(200).json({
        success: true,
        message: "Cart updated successfully",
        data: cart,
      });
    } catch (error: any) {
      console.error("❌ Update Cart Error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to update cart",
      });
    }
  }

  // 📌 REMOVE FROM CART
  public async removeFromCart(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const { productId } = req.params;

      const cart = await CartModel.model.findOne({ userId });
      if (!cart) {
        return res.status(404).json({
          success: false,
          message: "Cart not found",
        });
      }

      cart.items = cart.items.filter(
        (item) => item.productId.toString() !== productId
      );

      await cart.save();
      await cart.populate("items.productId");

      res.status(200).json({
        success: true,
        message: "Product removed from cart",
        data: cart,
      });
    } catch (error: any) {
      console.error("❌ Remove from Cart Error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to remove from cart",
      });
    }
  }

  // 📌 CLEAR CART
  public async clearCart(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;

      const cart = await CartModel.model.findOne({ userId });
      if (!cart) {
        return res.status(404).json({
          success: false,
          message: "Cart not found",
        });
      }

      cart.items = [];
      await cart.save();

      res.status(200).json({
        success: true,
        message: "Cart cleared successfully",
        data: cart,
      });
    } catch (error: any) {
      console.error("❌ Clear Cart Error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to clear cart",
      });
    }
  }

  // 📌 CHECKOUT (Reduces stock and clears cart)
  public async checkout(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;

      const cart = await CartModel.model
        .findOne({ userId })
        .populate("items.productId");

      if (!cart || cart.items.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Cart is empty",
        });
      }

      // Validate stock availability
      for (const item of cart.items) {
        const product: any = item.productId;
        if (!product) {
          return res.status(404).json({
            success: false,
            message: "Product not found in cart",
          });
        }

        if (product.stock < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${product.title}. Only ${product.stock} available`,
          });
        }
      }

      // Calculate totals
      const subtotal = cart.items.reduce((sum, item: any) => {
        return sum + item.productId.price * item.quantity;
      }, 0);

      const tax = subtotal * 0.18; // 18% tax
      const total = subtotal + tax;

      // Reduce stock for each product
      for (const item of cart.items) {
        await ProductModel.model.findByIdAndUpdate(item.productId, {
          $inc: { stock: -item.quantity },
        });
      }

      // Prepare order summary
      const orderSummary = {
        orderId: `ORD-${Date.now()}`,
        items: cart.items.map((item: any) => ({
          productId: item.productId._id,
          title: item.productId.title,
          price: item.productId.price,
          quantity: item.quantity,
          subtotal: item.productId.price * item.quantity,
        })),
        subtotal,
        tax,
        total,
        orderDate: new Date(),
      };

      // Clear cart after checkout
      cart.items = [];
      await cart.save();

      res.status(200).json({
        success: true,
        message: "Checkout successful! Payment pending.",
        data: orderSummary,
      });
    } catch (error: any) {
      console.error("❌ Checkout Error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Checkout failed",
      });
    }
  }
}

export default new CartController();