import type { Request, Response } from "express";
import ProductModel from "../models/product.model.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../config/cloudinary.config.js";

// 🔐 ALL PRODUCT OPERATIONS ARE ADMIN ONLY (handled by routes with authorize middleware)
export class ProductController {
  
  // 📌 CREATE PRODUCT (Admin Only)
  public async createProduct(req: Request, res: Response) {
    try {
      const { title, description, price, stock, category, image } = req.body;

      // Validation
      if (!title || !description || !price || !stock || !category || !image) {
        return res.status(400).json({
          success: false,
          message: "All fields are required including image",
        });
      }

      // Upload image to Cloudinary
      const uploadedImage = await uploadToCloudinary(image, "products");

      // Create product
      const product = await ProductModel.model.create({
        title,
        description,
        price,
        stock,
        category,
        image: {
          url: uploadedImage.url,
          publicId: uploadedImage.publicId,
        },
      });

      res.status(201).json({
        success: true,
        message: "Product created successfully",
        data: product,
      });
    } catch (error: any) {
      console.error("❌ Create Product Error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to create product",
      });
    }
  }

  // 📌 GET ALL PRODUCTS (Public - for users to view)
  public async getAllProducts(req: Request, res: Response) {
    try {
      const { category, minPrice, maxPrice, search, page = 1, limit = 10 } = req.query;

      // Build query
      const query: any = {};

      if (category) query.category = category;
      if (minPrice || maxPrice) {
        query.price = {};
        if (minPrice) query.price.$gte = Number(minPrice);
        if (maxPrice) query.price.$lte = Number(maxPrice);
      }
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }

      // Pagination
      const skip = (Number(page) - 1) * Number(limit);
      const total = await ProductModel.model.countDocuments(query);

      // Get products
      const products = await ProductModel.model
        .find(query)
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        data: {
          products,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit)),
          },
        },
      });
    } catch (error: any) {
      console.error("❌ Get Products Error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch products",
      });
    }
  }

  // 📌 GET SINGLE PRODUCT (Public - for users to view)
  public async getProductById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const product = await ProductModel.model.findById(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      res.status(200).json({
        success: true,
        data: product,
      });
    } catch (error: any) {
      console.error("❌ Get Product Error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch product",
      });
    }
  }

  // 📌 UPDATE PRODUCT (Admin Only)
  public async updateProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { title, description, price, stock, category, image } = req.body;

      const product = await ProductModel.model.findById(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      // If new image is provided, delete old and upload new
      if (image && image !== product.image.url) {
        // Delete old image
        await deleteFromCloudinary(product.image.publicId);

        // Upload new image
        const uploadedImage = await uploadToCloudinary(image, "products");
        product.image = {
          url: uploadedImage.url,
          publicId: uploadedImage.publicId,
        };
      }

      // Update other fields
      if (title) product.title = title;
      if (description) product.description = description;
      if (price) product.price = price;
      if (stock !== undefined) product.stock = stock;
      if (category) product.category = category;

      await product.save();

      res.status(200).json({
        success: true,
        message: "Product updated successfully",
        data: product,
      });
    } catch (error: any) {
      console.error("❌ Update Product Error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to update product",
      });
    }
  }

  // 📌 DELETE PRODUCT (Admin Only)
  public async deleteProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const product = await ProductModel.model.findById(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      // Delete image from Cloudinary
      await deleteFromCloudinary(product.image.publicId);

      // Delete product
      await ProductModel.model.findByIdAndDelete(id);

      res.status(200).json({
        success: true,
        message: "Product deleted successfully",
      });
    } catch (error: any) {
      console.error("❌ Delete Product Error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to delete product",
      });
    }
  }

  // 📌 GET PRODUCTS BY CATEGORY (Public)
  public async getProductsByCategory(req: Request, res: Response) {
    try {
      const { category } = req.params;

      const products = await ProductModel.model
        .find({ category })
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        data: products,
      });
    } catch (error: any) {
      console.error("❌ Get Products by Category Error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch products",
      });
    }
  }

  // 📌 GET ALL CATEGORIES (Public)
  public async getCategories(req: Request, res: Response) {
    try {
      const categories = await ProductModel.model.distinct("category");

      res.status(200).json({
        success: true,
        data: categories,
      });
    } catch (error: any) {
      console.error("❌ Get Categories Error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch categories",
      });
    }
  }
}

export default new ProductController();