import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser {
  username: string;
  email: string;
  password: string;
  role: "admin" | "user";
  createdAt?: Date;
  phonenumber:number;
}

export interface IUserDocument extends IUser, Document {}

class UserModel {
  private static schema = new Schema<IUserDocument>(
    {
      username: { type: String, required: true, minlength: 3 },
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      role: { type: String, enum: ["admin", "user"], default: "user" },
      phonenumber: {type:Number, required:true, unique:true}
    },
    { timestamps: true }
  );

  public static model: Model<IUserDocument> =
    mongoose.models.User || mongoose.model<IUserDocument>("User", this.schema);
}

export default UserModel;
