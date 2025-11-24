import { Router } from "express";
import productController from "../controllers/product.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", productController.getAllProducts.bind(productController));
router.get("/:id", productController.getProductById.bind(productController));

router.get("/category/:category", productController.getProductsByCategory.bind(productController));
router.get("/categories/all", productController.getCategories.bind(productController));
router.post(
  "/",
  authenticate,
  authorize("admin"),
  productController.createProduct.bind(productController)
);
router.put(
  "/:id",
  authenticate,
  authorize("admin"),
  productController.updateProduct.bind(productController)
);

router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  productController.deleteProduct.bind(productController)
);

export default router;