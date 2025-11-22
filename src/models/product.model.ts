import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProduct {
  title: string;
  description: string;
  price: number;
  image: {
    url: string;
    publicId: string;
  };
  stock: number;
  category: string;
  createdAt?: Date;
}

export interface IProductDocument extends IProduct, Document {}

class ProductModel {
  private static schema = new Schema<IProductDocument>(
    {
      title: { type: String, required: true },
      description: { type: String, required: true },
      price: { type: Number, required: true },
      stock: { type: Number, required: true, min: 0 },
      category: { type: String, required: true },
      image: {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
      },
    },
    { timestamps: true }
  );

  public static model: Model<IProductDocument> =
    mongoose.models.Product ||
    mongoose.model<IProductDocument>("Product", this.schema);
}

export default ProductModel;
