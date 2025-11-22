import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICartItem {
  productId: mongoose.Types.ObjectId;
  quantity: number;
}

export interface ICart {
  userId: mongoose.Types.ObjectId;
  items: ICartItem[];
}

export interface ICartDocument extends ICart, Document {}

class CartModel {
  private static schema = new Schema<ICartDocument>(
    {
      userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      items: [
        {
          productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
          quantity: { type: Number, required: true, default: 1 },
        },
      ],
    },
    { timestamps: true }
  );

  public static model: Model<ICartDocument> =
    mongoose.models.Cart ||
    mongoose.model<ICartDocument>("Cart", this.schema);
}

export default CartModel;
